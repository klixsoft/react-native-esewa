package com.klixsoft.esewa;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.BaseReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;

import java.util.HashMap;
import java.util.Map;

/** Registers {@link EsewaModule} with React Native. Autolinking adds this package for you. */
public class EsewaPackage extends BaseReactPackage {

  @Nullable
  @Override
  public NativeModule getModule(@NonNull String name, @NonNull ReactApplicationContext reactContext) {
    if (EsewaModule.NAME.equals(name)) {
      return new EsewaModule(reactContext);
    }
    return null;
  }

  @NonNull
  @Override
  public ReactModuleInfoProvider getReactModuleInfoProvider() {
    return () -> {
      final Map<String, ReactModuleInfo> moduleInfos = new HashMap<>();
      moduleInfos.put(
        EsewaModule.NAME,
        new ReactModuleInfo(EsewaModule.NAME, EsewaModule.class.getName(), false, false, false, true)
      );
      return moduleInfos;
    };
  }
}
