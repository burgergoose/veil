/*global Ultraviolet*/
self.__uv$config = {
  prefix: '/burgergoose/veil/main/v0007/a/service/',
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,
  handler: 'https://raw.githack.com/burgergoose/engine/main/a/uv.handler.js',
  client: 'https://raw.githack.com/burgergoose/engine/main/a/uv.client.js',
  bundle: 'https://raw.githack.com/burgergoose/engine/main/a/uv.bundle.js',
  config: '/burgergoose/veil/main/v0007/a/uv.config.js',
  sw: 'https://raw.githack.com/burgergoose/engine/main/a/uv.sw.js',
};
