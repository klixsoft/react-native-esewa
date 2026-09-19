package com.klixsoft.esewa;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.annotations.ReactModule;

/**
 * Talks to the eSewa app. It never opens a browser: a payment link is handed to the eSewa app only,
 * so an uninstalled app is reported instead of silently falling back to a web page.
 */
@ReactModule(name = EsewaModule.NAME)
public class EsewaModule extends NativeEsewaSpec {
  public static final String NAME = "KlixsoftEsewa";

  static final String ESEWA_PACKAGE = "com.f1soft.esewa";

  public EsewaModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @NonNull
  @Override
  public String getName() {
    return NAME;
  }

  private boolean installed() {
    try {
      getReactApplicationContext().getPackageManager().getPackageInfo(ESEWA_PACKAGE, 0);
      return true;
    } catch (PackageManager.NameNotFoundException e) {
      return false;
    }
  }

  @Override
  public void isInstalled(Promise promise) {
    promise.resolve(installed());
  }

  @Override
  public void openDeeplink(String url, Promise promise) {
    if (url == null || url.trim().isEmpty() || !installed()) {
      promise.resolve(false);
      return;
    }

    try {
      Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url.trim()));
      intent.setPackage(ESEWA_PACKAGE);
      launch(intent);
      promise.resolve(true);
    } catch (Exception e) {
      promise.resolve(false);
    }
  }

  @Override
  public void openStore(Promise promise) {
    try {
      launch(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + ESEWA_PACKAGE)));
      promise.resolve(true);
      return;
    } catch (Exception ignored) {
    }

    try {
      launch(new Intent(
        Intent.ACTION_VIEW,
        Uri.parse("https://play.google.com/store/apps/details?id=" + ESEWA_PACKAGE)
      ));
      promise.resolve(true);
    } catch (Exception e) {
      promise.resolve(false);
    }
  }

  private void launch(Intent intent) {
    Activity activity = getCurrentActivity();
    if (activity != null) {
      activity.startActivity(intent);
      return;
    }
    Context context = getReactApplicationContext();
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    context.startActivity(intent);
  }
}
