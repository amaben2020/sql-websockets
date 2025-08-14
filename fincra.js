const axios = require('axios');
require('dotenv').config();

const FINCRA_BASE_URL = 'https://sandboxapi.fincra.com';

const createVirtualAccount = async (user) => {
  const res = await axios.post(
    `${FINCRA_BASE_URL}/virtual-accounts`,
    {
      customer: {
        name: user.name,
        email: user.email,
      },
      currency: 'NGN',
      country: 'NG',
      preferredBank: 'wema',
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.FINCRA_SECRET_KEY}`,
      },
    }
  );

  return res.data.data;
};

const initiatePayout = async ({ amount, user, bankAccount }) => {
  const res = await axios.post(
    `${FINCRA_BASE_URL}/disbursements/payouts`,
    {
      business: process.env.BUSINESS_ID,
      sourceCurrency: 'NGN',
      destinationCurrency: 'NGN',
      amount: String(amount),
      description: 'Withdrawal',
      customerReference: `withdraw_${user.id}_${Date.now()}`,
      beneficiary: {
        firstName: user.name.split(' ')[0],
        lastName: user.name.split(' ')[1] || '',
        accountHolderName: user.name,
        type: 'individual',
        accountNumber: bankAccount.number,
        bankCode: bankAccount.bankCode,
        country: 'NG',
      },
      sender: {
        name: user.name,
        email: user.email,
      },
      paymentDestination: 'bank_account',
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.FINCRA_SECRET_KEY}`,
      },
    }
  );

  return res.data.data;
};

module.exports = { createVirtualAccount, initiatePayout };
