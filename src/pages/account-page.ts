import { expect, type Page } from '@playwright/test';

export type AccountDetails = { email: string; password: string; securityAnswer: string };

export class AccountPage {
  constructor(private readonly page: Page) {}

  async openLoginFromHeader(): Promise<void> {
    await this.page.getByRole('button', { name: 'Show/hide account menu' }).click();
    // Juice Shop renders account navigation entries as menuitems, not buttons.
    await this.page.getByRole('menuitem', { name: 'Go to login page' }).click();
    await expect(this.page.locator('#login-form')).toBeVisible();
  }

  async openRegistration(): Promise<void> {
    await this.page.locator('#newCustomerLink').getByRole('link').click();
    await expect(this.page.locator('#registration-form')).toBeVisible();
  }

  async register(account: AccountDetails): Promise<void> {
    await this.page.locator('#emailControl').fill(account.email);
    await this.page.locator('#passwordControl').fill(account.password);
    await this.page.locator('#repeatPasswordControl').fill(account.password);
    await this.page.locator('#securityQuestionControl').click();
    await this.page.getByRole('option').first().click();
    await this.page.locator('#securityAnswerControl').fill(account.securityAnswer);
    await this.page.getByRole('button', { name: 'Button to complete the registration' }).click();
    await expect(this.page.locator('#login-form')).toBeVisible();
  }

  async login(account: AccountDetails): Promise<void> {
    await this.page.locator('#email').fill(account.email);
    await this.page.locator('#password').fill(account.password);
    await this.page.locator('#loginButton').click();
    await expect(this.page.getByRole('button', { name: 'Show/hide account menu' })).toBeVisible();
  }

  async expectEmptyLoginFormCannotSubmit(): Promise<void> {
    await expect(this.page.locator('#loginButton')).toBeDisabled();
  }
}
