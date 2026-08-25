/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * The progressive-only settings on the loan product form: down payment and multi-tranche
 * disbursement (#188), capitalised income and buy-down fees (#190).
 *
 * Neither could be configured here before, so a product created in this application could never
 * use either, and `allowFullTermForTranche` on the loan application form was unreachable.
 *
 * The payload assertions are the point: hiding a control is not the same as not sending its
 * value, and a down payment left in the request would describe a product the cumulative engine
 * cannot honour. Mocked, so this runs in the fast CI project.
 */

import { test, expect, Page } from './fixtures';
import { selectOption } from './utils/select-option';

const TENANT = 'default';
const USER = 'mifos';
const PASSWORD = 'password';
const SCHEDULE_TYPE_LABEL = 'Loan Schedule Type';
const DOWN_PAYMENT_TESTID = 'loan-product-enable-down-payment';
const TRANCHE_COUNT_TESTID = 'loan-product-max-tranche-count';
const CAPITALIZATION_TESTID = 'loan-product-enable-income-capitalization';
const BUY_DOWN_TESTID = 'loan-product-enable-buy-down-fee';

/** The POST body the form submits, captured in Node so a navigation cannot discard it. */
interface Captured {
  body: Record<string, unknown> | null;
}

async function login(page: Page): Promise<Captured> {
  const captured: Captured = { body: null };

  await page.route('**/config.json*', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ fineractApiUrl: '/api/v1', defaultTenant: TENANT }),
    }),
  );

  await page.route('**/api/v1/authentication**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        username: USER,
        userId: 1,
        base64EncodedAuthenticationKey: 'YmFzZTY0',
        authenticated: true,
        officeId: 1,
        officeName: 'Head Office',
        roles: [{ id: 1, name: 'Super User', description: 'Super user' }],
        permissions: ['ALL_FUNCTIONS'],
      }),
    }),
  );

  await page.route(/\/api\/v1\/loanproducts\/template/, (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        currencyOptions: [{ code: 'USD', name: 'US Dollar', decimalPlaces: 2 }],
        amortizationTypeOptions: [{ id: 1, code: 'a', value: 'Equal installments' }],
        interestTypeOptions: [{ id: 0, code: 'i', value: 'Declining Balance' }],
        interestCalculationPeriodTypeOptions: [{ id: 1, code: 'c', value: 'Same as repayment' }],
        repaymentFrequencyTypeOptions: [{ id: 2, code: 'm', value: 'Months' }],
        interestRateFrequencyTypeOptions: [{ id: 3, code: 'y', value: 'Per year' }],
        accountingRuleOptions: [{ id: 1, code: 'none', value: 'None' }],
        loanScheduleTypeOptions: [
          { id: 1, code: 'CUMULATIVE', value: 'Cumulative' },
          { id: 2, code: 'PROGRESSIVE', value: 'Progressive' },
        ],
        loanScheduleProcessingTypeOptions: [{ id: 1, code: 'HORIZONTAL', value: 'Horizontal' }],
        transactionProcessingStrategyOptions: [
          { id: 1, code: 'mifos-standard-strategy', name: 'Penalties, Fees, Interest, Principal' },
          {
            id: 2,
            code: 'advanced-payment-allocation-strategy',
            name: 'Advanced payment allocation strategy',
          },
        ],
        advancedPaymentAllocationTypes: [{ id: 1, code: 'PAST_DUE_PENALTY', value: 'Past due' }],
        advancedPaymentAllocationTransactionTypes: [{ id: 1, code: 'DEFAULT', value: 'Default' }],
        advancedPaymentAllocationFutureInstallmentAllocationRules: [
          { id: 1, code: 'NEXT_INSTALLMENT', value: 'Next installment' },
        ],
        creditAllocationAllocationTypes: [],
        creditAllocationTransactionTypes: [],
        chargeOptions: [],
        capitalizedIncomeTypeOptions: [
          { code: 'FEE', value: 'Fee' },
          { code: 'INTEREST', value: 'Interest' },
        ],
        capitalizedIncomeCalculationTypeOptions: [{ code: 'FLAT', value: 'Flat' }],
        capitalizedIncomeStrategyOptions: [
          { code: 'EQUAL_AMORTIZATION', value: 'Equal amortization' },
        ],
        buyDownFeeIncomeTypeOptions: [{ code: 'FEE', value: 'Fee' }],
        buyDownFeeCalculationTypeOptions: [{ code: 'FLAT', value: 'Flat' }],
        buyDownFeeStrategyOptions: [{ code: 'EQUAL_AMORTIZATION', value: 'Equal amortization' }],
        interestRecalculationCompoundingTypeOptions: [
          { id: 0, code: 'interestRecalculationCompoundingMethod.none', description: 'None' },
          { id: 1, code: 'interestRecalculationCompoundingMethod.fee', description: 'Fee' },
        ],
        interestRecalculationFrequencyTypeOptions: [
          {
            id: 1,
            code: 'interestRecalculationFrequencyType.same.as.repayment.period',
            description: 'Same as repayment period',
          },
          { id: 2, code: 'interestRecalculationFrequencyType.daily', description: 'Daily' },
        ],
        rescheduleStrategyTypeOptions: [
          {
            id: 1,
            code: 'loanRescheduleStrategyMethod.reduce.emi.amount',
            description: 'Reduce EMI amount',
          },
        ],
        preClosureInterestCalculationStrategyOptions: [
          {
            id: 1,
            code: 'preClosureInterestCalculationStrategy.tillPreClosureDate',
            description: 'Till pre-close date',
          },
        ],
        repaymentStartDateTypeOptions: [
          { id: 1, code: 'repaymentStartDateType.disbursement', description: 'Disbursement date' },
        ],
        chargeOffBehaviourOptions: [
          { code: 'REGULAR', value: 'Regular' },
          { code: 'ZERO_INTEREST', value: 'Zero interest' },
        ],
      }),
    }),
  );

  await page.route(/\/api\/v1\/loanproducts(\?|$)/, async (route) => {
    if (route.request().method() === 'POST') {
      captured.body = JSON.parse(route.request().postData() ?? '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ resourceId: 99 }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.goto('/login');
  await page.locator('#tenantId').fill(TENANT);
  await page.locator('#username').fill(USER);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL('/dashboard');

  return captured;
}

/**
 * Submits the loan-product form. The submit button is disabled while the
 * reactive form settles; under parallel workers that settle window can stretch,
 * and a bare click then burns its whole 30s timeout on 'enabled'. Waiting for
 * the enabled state explicitly says what we are waiting for — and fails fast
 * with a readable message if the form never becomes valid.
 */
async function submitLoanProduct(page: Page): Promise<void> {
  const submit = page.getByTestId('loan-product-submit-btn');
  await expect(submit).toBeEnabled();
  await submit.click();
}

async function fillRequiredFields(page: Page, name: string): Promise<void> {
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
  await page.getByRole('textbox', { name: 'Short Name' }).fill('DP01');
  await page.getByRole('spinbutton', { name: 'Principal' }).fill('1000');
  await page.getByRole('spinbutton', { name: 'Interest Rate' }).fill('10');
  await page.getByRole('spinbutton', { name: 'Number of Repayments' }).fill('6');
  await page.getByRole('spinbutton', { name: 'Repayment Every' }).fill('1');
}

test.describe('Loan product down payment and tranches', () => {
  test('down payment is offered only for a progressive product', async ({ page }) => {
    await login(page);
    await page.goto('/products/loan/create');
    await expect(page.getByTestId('loan-product-schedule-type')).toBeVisible();

    // Cumulative: not merely hidden — the form says where the setting lives.
    await expect(page.getByTestId(DOWN_PAYMENT_TESTID)).toHaveCount(0);
    await expect(page.getByTestId('down-payment-unavailable-note')).toBeVisible();

    await selectOption(page, SCHEDULE_TYPE_LABEL, 'Progressive');
    await expect(page.getByTestId(DOWN_PAYMENT_TESTID)).toBeVisible();
    await expect(page.getByTestId('down-payment-unavailable-note')).toHaveCount(0);
  });

  test('the percentage and auto-repayment appear only once down payment is on', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/products/loan/create');
    await selectOption(page, SCHEDULE_TYPE_LABEL, 'Progressive');

    await expect(page.getByTestId('loan-product-down-payment-percentage')).toHaveCount(0);

    await page.getByTestId(DOWN_PAYMENT_TESTID).click();

    await expect(page.getByTestId('loan-product-down-payment-percentage')).toBeVisible();
    await expect(page.getByTestId('loan-product-auto-repayment-down-payment')).toBeVisible();
  });

  test('multi-tranche disbursement reveals its tranche count, on either engine', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/products/loan/create');

    await expect(page.getByTestId(TRANCHE_COUNT_TESTID)).toHaveCount(0);
    await page.getByTestId('loan-product-multi-disburse').click();
    await expect(page.getByTestId(TRANCHE_COUNT_TESTID)).toBeVisible();
    await expect(page.getByTestId('loan-product-disallow-expected-disbursements')).toBeVisible();
  });

  test('submits the down payment and tranche settings it was given', async ({ page }) => {
    const captured = await login(page);
    await page.goto('/products/loan/create');
    await fillRequiredFields(page, 'E2E Down Payment Product');

    await selectOption(page, SCHEDULE_TYPE_LABEL, 'Progressive');
    await page.getByTestId(DOWN_PAYMENT_TESTID).click();
    await page.getByTestId('loan-product-down-payment-percentage').locator('input').fill('20');
    await page.getByTestId('loan-product-multi-disburse').click();
    await page.getByTestId(TRANCHE_COUNT_TESTID).locator('input').fill('3');

    await submitLoanProduct(page);

    await expect.poll(() => captured.body).not.toBeNull();
    expect(captured.body).toMatchObject({
      loanScheduleType: 'PROGRESSIVE',
      enableDownPayment: true,
      disbursedAmountPercentageForDownPayment: 20,
      multiDisburseLoan: true,
      maxTrancheCount: 3,
    });
  });

  test('does not send a down payment on a cumulative product', async ({ page }) => {
    const captured = await login(page);
    await page.goto('/products/loan/create');
    await fillRequiredFields(page, 'E2E Cumulative Product');

    // Configure a down payment, then move the product back to the other engine. Hiding the
    // controls is not enough: the values must leave the payload too.
    await selectOption(page, SCHEDULE_TYPE_LABEL, 'Progressive');
    await page.getByTestId(DOWN_PAYMENT_TESTID).click();
    await page.getByTestId('loan-product-down-payment-percentage').locator('input').fill('20');
    await selectOption(page, SCHEDULE_TYPE_LABEL, 'Cumulative');

    await submitLoanProduct(page);

    await expect.poll(() => captured.body).not.toBeNull();
    const body = captured.body as Record<string, unknown>;
    expect(body['loanScheduleType']).toBe('CUMULATIVE');
    expect(body['enableDownPayment']).toBeUndefined();
    expect(body['disbursedAmountPercentageForDownPayment']).toBeUndefined();
  });

  test('income recognition is offered only for a progressive product', async ({ page }) => {
    await login(page);
    await page.goto('/products/loan/create');
    await expect(page.getByTestId('loan-product-schedule-type')).toBeVisible();

    await expect(page.getByTestId(CAPITALIZATION_TESTID)).toHaveCount(0);
    await expect(page.getByTestId(BUY_DOWN_TESTID)).toHaveCount(0);

    await selectOption(page, SCHEDULE_TYPE_LABEL, 'Progressive');

    await expect(page.getByTestId(CAPITALIZATION_TESTID)).toBeVisible();
    await expect(page.getByTestId(BUY_DOWN_TESTID)).toBeVisible();
  });

  test('the capitalisation details appear only once it is on', async ({ page }) => {
    await login(page);
    await page.goto('/products/loan/create');
    await selectOption(page, SCHEDULE_TYPE_LABEL, 'Progressive');

    await expect(page.getByTestId('loan-product-capitalized-income-type')).toHaveCount(0);

    await page.getByTestId(CAPITALIZATION_TESTID).click();

    await expect(page.getByTestId('loan-product-capitalized-income-type')).toBeVisible();
    await expect(page.getByTestId('loan-product-capitalized-income-calculation')).toBeVisible();
    await expect(page.getByTestId('loan-product-capitalized-income-strategy')).toBeVisible();
  });

  test('submits the income recognition settings it was given', async ({ page }) => {
    const captured = await login(page);
    await page.goto('/products/loan/create');
    await fillRequiredFields(page, 'E2E Capitalised Income Product');

    await selectOption(page, SCHEDULE_TYPE_LABEL, 'Progressive');
    await page.getByTestId(CAPITALIZATION_TESTID).click();
    await page.getByTestId(BUY_DOWN_TESTID).click();

    await submitLoanProduct(page);

    await expect.poll(() => captured.body).not.toBeNull();
    expect(captured.body).toMatchObject({
      enableIncomeCapitalization: true,
      capitalizedIncomeType: 'FEE',
      capitalizedIncomeCalculationType: 'FLAT',
      capitalizedIncomeStrategy: 'EQUAL_AMORTIZATION',
      enableBuyDownFee: true,
      buyDownFeeIncomeType: 'FEE',
      buyDownFeeStrategy: 'EQUAL_AMORTIZATION',
    });
  });

  test('does not send income recognition on a cumulative product', async ({ page }) => {
    const captured = await login(page);
    await page.goto('/products/loan/create');
    await fillRequiredFields(page, 'E2E Cumulative No Capitalisation');

    await selectOption(page, SCHEDULE_TYPE_LABEL, 'Progressive');
    await page.getByTestId(CAPITALIZATION_TESTID).click();
    await page.getByTestId(BUY_DOWN_TESTID).click();
    await selectOption(page, SCHEDULE_TYPE_LABEL, 'Cumulative');

    await submitLoanProduct(page);

    await expect.poll(() => captured.body).not.toBeNull();
    const body = captured.body as Record<string, unknown>;
    expect(body['enableIncomeCapitalization']).toBeUndefined();
    expect(body['capitalizedIncomeType']).toBeUndefined();
    expect(body['enableBuyDownFee']).toBeUndefined();
    expect(body['buyDownFeeStrategy']).toBeUndefined();
  });

  test('interest recalculation reveals its mandatory settings only once it is on', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/products/loan/create');
    await expect(page.getByTestId('loan-product-interest-recalculation')).toBeVisible();

    await expect(page.getByTestId('loan-product-compounding-method')).toHaveCount(0);

    await page.getByTestId('loan-product-interest-recalculation').click();

    await expect(page.getByTestId('loan-product-compounding-method')).toBeVisible();
    await expect(page.getByTestId('loan-product-reschedule-strategy')).toBeVisible();
    await expect(page.getByTestId('loan-product-rest-frequency')).toBeVisible();
  });

  test('the rest interval appears only when the frequency is not the repayment period', async ({
    page,
  }) => {
    // Two ion-select overlays in sequence on a form whose options arrive from the template
    // request; under parallel workers the default 30s is not enough to open the second reliably.
    test.slow();
    await login(page);
    await page.goto('/products/loan/create');
    await page.getByTestId('loan-product-interest-recalculation').click();

    // Seeded with "same as repayment period", which needs no interval.
    await expect(page.getByTestId('loan-product-rest-interval')).toHaveCount(0);

    // Wait for the select to be attached before driving it: its options come from the template
    // request, and picking from it before that resolves times out under parallel load.
    await expect(page.getByTestId('loan-product-rest-frequency')).toBeVisible();
    await selectOption(page, 'How often interest is recalculated', 'Daily');

    await expect(page.getByTestId('loan-product-rest-interval')).toBeVisible();
  });

  test('submits the interest recalculation settings it was given', async ({ page }) => {
    const captured = await login(page);
    await page.goto('/products/loan/create');
    await fillRequiredFields(page, 'E2E Recalculating Product');

    await page.getByTestId('loan-product-interest-recalculation').click();
    await submitLoanProduct(page);

    await expect.poll(() => captured.body).not.toBeNull();
    expect(captured.body).toMatchObject({
      isInterestRecalculationEnabled: true,
      interestRecalculationCompoundingMethod: 0,
      rescheduleStrategyMethod: 1,
      recalculationRestFrequencyType: 1,
    });
  });

  test('does not send recalculation settings once it is switched back off', async ({ page }) => {
    const captured = await login(page);
    await page.goto('/products/loan/create');
    await fillRequiredFields(page, 'E2E No Recalculation Product');

    await page.getByTestId('loan-product-interest-recalculation').click();
    await page.getByTestId('loan-product-interest-recalculation').click();

    await submitLoanProduct(page);

    await expect.poll(() => captured.body).not.toBeNull();
    const body = captured.body as Record<string, unknown>;
    expect(body['isInterestRecalculationEnabled']).toBe(false);
    expect(body['interestRecalculationCompoundingMethod']).toBeUndefined();
    expect(body['rescheduleStrategyMethod']).toBeUndefined();
    expect(body['recalculationRestFrequencyType']).toBeUndefined();
  });
});
