require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "RNKlixsoftEsewa"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = { "Klixsoft" => "https://github.com/klixsoft" }

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/klixsoft/react-native-esewa.git", :tag => "v#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm}"

  install_modules_dependencies(s)
end
