/*global Ultraviolet*/
self.__uv$config = {
  prefix: '/burgergoose/veil/main/app/uv/service/',
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,
  handler: '/burgergoose/veil/main/app/uv/uv.handler.js',
  client: '/burgergoose/veil/main/app/uv/uv.client.js',
  bundle: '/burgergoose/veil/main/app/uv/uv.bundle.js',
  config: '/burgergoose/veil/main/app/uv/uv.config.js',
  sw: '/burgergoose/veil/main/app/uv/uv.sw.js',
};
