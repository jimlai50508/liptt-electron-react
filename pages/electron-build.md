# 實驗中

## Windows 10 打包 & 生成 Appx 憑證
- [electron-builder](https://www.electron.build/)

appx 配置範例：
```
"appx" : { 
  "identityName" : "liptt.react",
  "publisher" : "CN=lightyen",
  "publisherDisplayName" : "lightyen"
}
```
※identityName名稱有規定格式，我之前加入了減號'-'然後就一直弄不過...
```
# 開啟powershell環境(系統管理員)

# 檢視關於cert的指令
Get-Command *cert*

# 建立測試用憑證
electron-builder create-self-signed-cert -p [PublishName]

# 選擇[無]

# 把憑證加入到本機電腦->受信任的人
Import-PfxCertificate .\[PublishName].pfx -CertStoreLocation Cert:\LocalMachine\TrustedPeople\

# 最後建立appx打包
electron-builder
```
Windows Store App 圖示資產配置說明：
https://www.electron.build/configuration/appx#appx-assets




<!-- ## Demo 畫面

<img src="https://i.imgur.com/Su0pi65.png"/> -->