// .cjs because package.json sets "type": "module", which would otherwise make
// this file be read as ESM and break the module.exports below.
module.exports = {
  extends: ['@commitlint/config-conventional'],
};
