// fincra-webhook.controller.js
import catchAsync from '../utils/catchAsync.js';
import dbConn from '../configuration/db.config.js';
import {
  alphaNumeric,
  dateCreated,
  sumAmountFormatter,
} from '../utils/utitlity.helpers.js';
import pushNotification from '../services/push-notification.service.js';
import businessPushNotification from '../services/business-push-notification.service.js';
import QueryBuilder from '../class/query-builder.js';

const FINCRA_WEBHOOK_SECRET = 'YOUR_WEBHOOK_SECRET'; // Store this securely in env

function validateFincraSignature(req) {
  const receivedSig = req.headers['x-fincra-signature'];
  const expectedSig = FINCRA_WEBHOOK_SECRET; // In production, compute HMAC-SHA256
  return receivedSig === expectedSig;
}

const fincraWebhook = catchAsync(async (req, res, next) => {
  const { body } = req;

  if (!validateFincraSignature(req)) {
    return res
      .status(401)
      .json({ status: 'fail', message: 'Invalid signature' });
  }

  const connection = await dbConn.getConnection();
  await connection.beginTransaction();

  try {
    const createdAt = dateCreated();
    const transaction_id = new Date().getTime();
    const order_reference = `BLUE-${alphaNumeric()}`;
    const account_number = body?.data?.virtualAccount?.accountNumber;
    const amount = parseFloat(body?.data?.amount);

    const walletAccount = await findAccountDetails(account_number);
    if (!walletAccount) throw new Error('Account not found');

    if (walletAccount.type === 'personal') {
      const [[wallet]] = await connection.query(
        'SELECT id, balance, user_id, wallet_code FROM wallets WHERE id = ? FOR UPDATE',
        [walletAccount.wallet_id]
      );

      const updatedBalance = sumAmountFormatter(wallet.balance, amount);

      const transactionRecord = {
        user_id: walletAccount.user_id,
        amount,
        order_reference,
        receiver_name: walletAccount.receiver_name,
        receiver_wallet: wallet.wallet_code,
        transaction_id,
        payment_mode: 'bank_transfer',
        status: 'successful',
        created_at: createdAt,
        narration: 'WALLET TOP-UP VIA FINCRA',
      };

      await Promise.all([
        connection.query('INSERT INTO transactions SET ?', [transactionRecord]),
        connection.query('INSERT INTO wallet_snapshots SET ?', [
          {
            user_id: walletAccount.user_id,
            wallet_id: wallet.id,
            amount,
            balance_before: wallet.balance,
            balance_after: updatedBalance,
            type: 'credit',
            created_at: createdAt,
            transaction_reference: transaction_id,
          },
        ]),
        connection.query('INSERT INTO transaction_histories SET ?', [
          {
            user_id: walletAccount.user_id,
            transaction_id,
            receiver_name: walletAccount.receiver_name,
            sender_name: walletAccount.receiver_name,
            amount,
            balance_before: wallet.balance,
            balance_after: updatedBalance,
            payment_mode: 'bank_transfer',
            type: 'credit',
            status: 'successful',
            created_at: createdAt,
            transaction_reference: transaction_id,
          },
        ]),
        pushNotification(
          `Wallet funded with ₦${amount}`,
          'Wallet Top-Up',
          walletAccount.user_id,
          true
        ),
      ]);

      await new QueryBuilder()
        .creditBalance(wallet.user_id, wallet.id, updatedBalance)
        .execute(connection);
    }

    // TODO: Add business wallet logic (same pattern)

    await connection.commit();
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error(error);
    await connection.rollback();
    res.status(500).json({ status: 'error', message: 'Processing failed' });
  } finally {
    connection.release();
  }
});

async function findAccountDetails(accountNumber) {
  const [businessRes] = await dbConn.query(
    `SELECT bwa.wallet_id, bp.name AS receiver_name, bp.id AS business_id, bu.notification_status
     FROM business_wallet_accounts bwa
     JOIN business_profiles bp ON bwa.business_id = bp.id
     JOIN business_users bu ON bp.user_id = bu.id
     WHERE bwa.account_number = ?`,
    [accountNumber]
  );
  if (businessRes.length) return { ...businessRes[0], type: 'business' };

  const [personalRes] = await dbConn.query(
    `SELECT wa.user_id, wa.wallet_id, CONCAT(u.first_name, ' ', u.last_name) AS receiver_name
     FROM wallet_accounts wa
     JOIN users u ON wa.user_id = u.id
     WHERE wa.account_number = ?`,
    [accountNumber]
  );
  if (personalRes.length) return { ...personalRes[0], type: 'personal' };

  return null;
}

export default {
  webhook: fincraWebhook,
};
