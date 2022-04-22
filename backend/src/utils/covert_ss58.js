const { Keyring } = require("@polkadot/keyring");
const { backendConfig } = require("../config");

module.exports.ss58Format = (address) => {
  const keyring = new Keyring();
  keyring.setSS58Format(backendConfig.Ss58Format);
  const res = keyring.addFromAddress(address);
  return res.address;
};
