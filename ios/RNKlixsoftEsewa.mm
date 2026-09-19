#import "RNKlixsoftEsewa.h"

#import <UIKit/UIKit.h>

static NSString *const kEsewaScheme = @"esewa";
static NSString *const kEsewaStoreUrl = @"https://apps.apple.com/np/app/esewa/id614370939";

@implementation RNKlixsoftEsewa

RCT_EXPORT_MODULE(KlixsoftEsewa)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (void)isInstalled:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    NSURL *probe = [NSURL URLWithString:[kEsewaScheme stringByAppendingString:@"://"]];
    resolve(@([[UIApplication sharedApplication] canOpenURL:probe]));
  });
}

- (void)openDeeplink:(NSString *)url resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  NSString *trimmed = [url stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
  NSURL *target = trimmed.length > 0 ? [NSURL URLWithString:trimmed] : nil;
  if (target == nil) {
    resolve(@NO);
    return;
  }

  dispatch_async(dispatch_get_main_queue(), ^{
    UIApplication *application = [UIApplication sharedApplication];
    NSURL *probe = [NSURL URLWithString:[kEsewaScheme stringByAppendingString:@"://"]];
    if (![application canOpenURL:probe]) {
      resolve(@NO);
      return;
    }

    if (![target.scheme hasPrefix:@"http"]) {
      [application openURL:target options:@{} completionHandler:^(BOOL success) {
        resolve(@(success));
      }];
      return;
    }

    [application openURL:target
                 options:@{UIApplicationOpenURLOptionUniversalLinksOnly : @YES}
       completionHandler:^(BOOL handledByApp) {
         if (handledByApp) {
           resolve(@YES);
           return;
         }
         [application openURL:target options:@{} completionHandler:^(BOOL success) {
           resolve(@(success));
         }];
       }];
  });
}

- (void)openStore:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    NSURL *store = [NSURL URLWithString:kEsewaStoreUrl];
    [[UIApplication sharedApplication] openURL:store
                                       options:@{}
                             completionHandler:^(BOOL success) {
                               resolve(@(success));
                             }];
  });
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeEsewaSpecJSI>(params);
}

@end
