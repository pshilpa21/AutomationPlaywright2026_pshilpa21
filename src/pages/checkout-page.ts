import { expect, type Page } from '@playwright/test';

export type DeliveryAddress = {
  country: string;
  name: string;
  mobileNumber: string;
  zipCode: string;
  streetAddress: string;
  city: string;
  state: string;
};

export type PaymentCard = { name: string; number: string; month: string; year: string };

export class CheckoutPage {
  constructor(private readonly page: Page) {}

  async expectAddressStepAndContinueDisabled(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /select (an )?address/i })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Proceed to payment selection' })).toBeDisabled();
  }

  async addAddress(address: DeliveryAddress): Promise<void> {
    await this.page.getByRole('button', { name: 'Add a new address' }).click();
    const form = this.page.locator('#address-form');
    await form.getByLabel('Country').fill(address.country);
    await form.getByLabel('Name').fill(address.name);
    await form.getByLabel('Mobile Number').fill(address.mobileNumber);
    await form.getByLabel('ZIP Code').fill(address.zipCode);
    await form.getByLabel('Address').fill(address.streetAddress);
    await form.getByLabel('City').fill(address.city);
    await form.getByLabel('State').fill(address.state);
    await this.page.locator('#submitButton').click();
    await expect(this.page.getByRole('heading', { name: /select (an )?address/i })).toBeVisible();
  }

  async selectAddressAndContinue(name: string): Promise<void> {
    await this.page.locator('mat-row').filter({ hasText: name }).click();
    await this.page.getByRole('button', { name: 'Proceed to payment selection' }).click();
  }

  async selectFirstDeliveryMethodAndContinue(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /choose a delivery speed/i })).toBeVisible();
    const continueButton = this.page.getByRole('button', { name: 'Proceed to delivery method selection' });
    await expect(continueButton).toBeDisabled();
    await this.page.locator('mat-row').first().click();
    await continueButton.click();
  }

  async addCardAndContinue(card: PaymentCard): Promise<void> {
    const addCardPanel = this.page.locator('mat-expansion-panel-header').filter({ hasText: /add new card/i });
    await addCardPanel.click();
    const paymentMethod = this.page.locator('app-payment-method');
    await paymentMethod.getByLabel('Name').fill(card.name);
    await paymentMethod.getByLabel('Card Number').fill(card.number);
    await paymentMethod.locator('select').nth(0).selectOption(card.month);
    await paymentMethod.locator('select').nth(1).selectOption(card.year);
    await paymentMethod.locator('#submitButton').click();

    const cardRow = this.page.locator('mat-row').filter({ hasText: card.name });
    await expect(cardRow).toBeVisible();
    await cardRow.getByRole('radio').click();

    const continueButton = this.page.getByRole('button', { name: 'Proceed to review' });
    await expect(continueButton).toBeEnabled();
    await continueButton.click();
  }

  async placeOrderAndExpectConfirmation(productName: string, addressName: string): Promise<void> {
    await expect(this.page.locator('#app-purchase-basket')).toContainText(productName);
    await expect(this.page.getByText(addressName, { exact: true })).toBeVisible();
    await this.page.getByRole('button', { name: 'Complete your purchase' }).click();
    await expect(this.page.getByRole('heading', { name: /thank.*purchase/i })).toBeVisible();
    await expect(this.page.locator('mat-row').filter({ hasText: productName })).toBeVisible();
  }
}
