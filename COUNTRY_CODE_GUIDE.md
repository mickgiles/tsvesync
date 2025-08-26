# Country Code Configuration Guide

## Why Country Code Matters

VeSync assigns a country code to your account when you create it. This country code must be provided during authentication for the login to succeed.

## How to Configure

### Homebridge UI (Recommended)

When configuring the plugin in Homebridge UI, you'll see a **Country Code** dropdown. Simply select your country from the list.

### Manual Configuration (config.json)

If editing config.json directly, add your country code:

```json
{
  "platform": "TSVESyncPlatform",
  "name": "VeSync",
  "username": "your-email@example.com",
  "password": "your-password",
  "countryCode": "YOUR_CODE_HERE"
}
```

## Common Country Codes

### Americas
- 🇺🇸 United States: `US` (default)
- 🇨🇦 Canada: `CA`
- 🇲🇽 Mexico: `MX`
- 🇧🇷 Brazil: `BR`
- 🇦🇷 Argentina: `AR`

### Europe  
- 🇬🇧 United Kingdom: `GB`
- 🇩🇪 Germany: `DE`
- 🇫🇷 France: `FR`
- 🇮🇹 Italy: `IT`
- 🇪🇸 Spain: `ES`
- 🇳🇱 Netherlands: `NL`
- 🇧🇪 Belgium: `BE`
- 🇦🇹 Austria: `AT`
- 🇨🇭 Switzerland: `CH`
- 🇸🇪 Sweden: `SE`
- 🇳🇴 Norway: `NO`
- 🇩🇰 Denmark: `DK`
- 🇫🇮 Finland: `FI`
- 🇵🇱 Poland: `PL`

### Asia-Pacific
- 🇦🇺 Australia: `AU`
- 🇳🇿 New Zealand: `NZ`
- 🇯🇵 Japan: `JP`
- 🇰🇷 South Korea: `KR`
- 🇸🇬 Singapore: `SG`
- 🇲🇾 Malaysia: `MY`
- 🇮🇩 Indonesia: `ID`
- 🇵🇭 Philippines: `PH`
- 🇹🇭 Thailand: `TH`
- 🇮🇳 India: `IN`

### Middle East & Africa
- 🇦🇪 United Arab Emirates: `AE`
- 🇸🇦 Saudi Arabia: `SA`
- 🇿🇦 South Africa: `ZA`
- 🇪🇬 Egypt: `EG`
- 🇳🇬 Nigeria: `NG`

## Which Region Endpoint?

Most countries use one of two endpoints:

### US Endpoint (smartapi.vesync.com)
Used by: US, CA, MX, AU, NZ, JP, and most other countries

### EU Endpoint (smartapi.vesync.eu)  
Used by: Most European countries

The plugin will automatically try both endpoints if needed.

## Troubleshooting

### "Cross region error" 
This means your account's country code doesn't match what you configured. Try:
1. Ensure you selected the correct country in the dropdown
2. The plugin will automatically try the other endpoint

### "Account or password incorrect"
Double-check your credentials - this is not a country code issue.

### Still Having Issues?
1. Check which country you selected when creating your VeSync account
2. Try logging into the VeSync mobile app to confirm your account works
3. Contact VeSync support to confirm your account's region

## Examples

### US User (most common)
```json
{
  "countryCode": "US"  // This is the default
}
```

### German User
```json
{
  "countryCode": "DE"
}
```

### Australian User  
```json
{
  "countryCode": "AU"
}
```

### French User
```json
{
  "countryCode": "FR"
}
```