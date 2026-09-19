import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  /** True when the eSewa app is installed on this device. */
  isInstalled(): Promise<boolean>;

  /**
   * Opens an eSewa payment link (`https://[rc-]links.esewa.com.np/pay/<booking_id>`) directly in
   * the eSewa app. Resolves `true` when the app took the link, `false` when it could not be opened
   * (for example the app is not installed). Never opens a browser.
   */
  openDeeplink(url: string): Promise<boolean>;

  /** Opens the eSewa page in the Play Store / App Store. Resolves `true` when a store opened. */
  openStore(): Promise<boolean>;
}

export default TurboModuleRegistry.get<Spec>('KlixsoftEsewa');
