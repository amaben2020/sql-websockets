// fincra.service.js
import axios from 'axios';
import config from '../configuration/config.js';
import AppError from '../utils/AppError.js';

class FincraService {
  constructor() {
    this.apiKey = config.fincra.api_key;
    this.baseUrl =
      config.app_env === 'PRODUCTION'
        ? 'https://api.fincra.com'
        : 'https://sandbox.api.fincra.com';
  }

  async createVirtualAccount(user) {
    const payload = {
      customer: {
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        phoneNumber: user.phone,
      },
      currency: 'NGN',
      country: 'NG',
      provider: 'wema', // or 'providus'
    };

    const response = await axios.post(
      `${this.baseUrl}/virtual-accounts`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response?.data?.data?.accountNumber) {
      throw new AppError('Fincra failed to create virtual account', 500);
    }

    const account = response.data.data;

    return {
      account_number: account.accountNumber,
      account_name: account.accountName,
      bank: account.bankName,
      transaction_id: account.reference,
    };
  }

  async ensureVirtualAccount(
    user,
    walletAccountService,
    walletService,
    connection
  ) {
    const walletAccount = await walletAccountService.findByUserId(
      user.id,
      connection
    );

    if (walletAccount.length === 0) {
      const generatedAccount = await this.createVirtualAccount(user);
      const wallet = await walletService.findById(user.id, connection);

      await walletAccountService.create(
        user.id,
        wallet.id,
        user.phone,
        generatedAccount,
        connection,
        null
      );

      return generatedAccount;
    }

    return walletAccount[0];
  }

  async payoutToBank(accountNumber, bankCode, amount, reference) {
    const payload = {
      amount,
      currency: 'NGN',
      destination: {
        type: 'bank_account',
        bankCode,
        accountNumber,
      },
      narration: 'Withdrawal',
      reference,
    };

    const response = await axios.post(`${this.baseUrl}/payouts`, payload, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response?.data?.data) {
      throw new AppError('Fincra payout failed', 500);
    }

    return response.data.data;
  }
}

export default FincraService;
