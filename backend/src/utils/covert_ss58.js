const { Keyring } = require("@polkadot/keyring");

module.exports.ss58Format = (address, format = 204) => {
  const keyring = new Keyring();
  keyring.setSS58Format(format);
  const res = keyring.addFromAddress(address);
  return res.address;
};
