# Changelog

## [5.1.0](https://github.com/ipfs/helia/compare/helia-v5.0.1...helia-v5.1.0) (2024-10-23)


### Features

* enable filtering in delegated routing client ([#651](https://github.com/ipfs/helia/issues/651)) ([23ebae1](https://github.com/ipfs/helia/commit/23ebae1072fbbda371ee1d68efb5ecd25d6e339e))


### Bug Fixes

* add va1 bootstrapper ([#649](https://github.com/ipfs/helia/issues/649)) ([460853f](https://github.com/ipfs/helia/commit/460853f915661c794e52299529bda41a893f7b5b))


### Dependencies

* update @libp2p/circuit-relay-v2 to 3.x.x ([#661](https://github.com/ipfs/helia/issues/661)) ([0238ed4](https://github.com/ipfs/helia/commit/0238ed47a63a4f51f66010c50659e6f892b212b5))
* The following workspace dependencies were updated
  * dependencies
    * @helia/block-brokers bumped from ^4.0.0 to ^4.0.1
    * @helia/routers bumped from ^2.0.0 to ^2.1.0
    * @helia/utils bumped from ^1.0.0 to ^1.0.1

## [5.0.1](https://github.com/ipfs/helia/compare/helia-v5.0.0...helia-v5.0.1) (2024-10-16)


### Bug Fixes

* respect routers config in helia constructor ([#652](https://github.com/ipfs/helia/issues/652)) ([1b2934b](https://github.com/ipfs/helia/commit/1b2934b313800fdb0c9684fe203f44471769eb17))

## [5.0.0](https://github.com/ipfs/helia/compare/helia-v4.2.6...helia-v5.0.0) (2024-10-07)


### ⚠ BREAKING CHANGES

* helia now uses libp2p@2.x.x

### Bug Fixes

* add doc-check script and export types used by functions ([#637](https://github.com/ipfs/helia/issues/637)) ([4f14996](https://github.com/ipfs/helia/commit/4f14996a9b976f2b60f4c8fe52a4fd1632420749))
* remove delegated routing api client patch ([#632](https://github.com/ipfs/helia/issues/632)) ([9de08ef](https://github.com/ipfs/helia/commit/9de08ef9c1cbdb723f524672f67574bf1dbed937))
* update to libp2p@2.x.x ([#630](https://github.com/ipfs/helia/issues/630)) ([ec8bf66](https://github.com/ipfs/helia/commit/ec8bf66dd870b42d6e5ef2b41706102397e0d39a))


### Dependencies

* update kad-dht to 14.0.0 ([#648](https://github.com/ipfs/helia/issues/648)) ([60d8c8a](https://github.com/ipfs/helia/commit/60d8c8a9ff2104302d1c87bcf39258f1da33cd45))
* The following workspace dependencies were updated
  * dependencies
    * @helia/block-brokers bumped from ^3.0.4 to ^4.0.0
    * @helia/interface bumped from ^4.3.1 to ^5.0.0
    * @helia/routers bumped from ^1.1.1 to ^2.0.0
    * @helia/utils bumped from ^0.3.3 to ^1.0.0

## [4.2.6](https://github.com/ipfs/helia/compare/helia-v4.2.5...helia-v4.2.6) (2024-09-13)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @helia/block-brokers bumped from ^3.0.3 to ^3.0.4

## [4.2.5](https://github.com/ipfs/helia/compare/helia-v4.2.4...helia-v4.2.5) (2024-07-31)


### Bug Fixes

* update js-libp2p types ([#570](https://github.com/ipfs/helia/issues/570)) ([b4877b5](https://github.com/ipfs/helia/commit/b4877b5b768895684be90a26f4303ae65fc209e7))


### Documentation

* fix grammar - it's -&gt; its ([#565](https://github.com/ipfs/helia/issues/565)) ([155e24d](https://github.com/ipfs/helia/commit/155e24db8c06c33972895d702a656e0c2996f3d9))


### Dependencies

* bump aegir from 42.2.11 to 43.0.1 ([#552](https://github.com/ipfs/helia/issues/552)) ([74ccc92](https://github.com/ipfs/helia/commit/74ccc92793a6d0bb4bee714d9fe4fa4183aa4ee8))
* bump aegir from 43.0.3 to 44.0.1 ([#569](https://github.com/ipfs/helia/issues/569)) ([6952f05](https://github.com/ipfs/helia/commit/6952f05357844e5aa3dffb2afaf261df06b9b7c1))
* The following workspace dependencies were updated
  * dependencies
    * @helia/block-brokers bumped from ^3.0.2 to ^3.0.3
    * @helia/interface bumped from ^4.3.0 to ^4.3.1
    * @helia/routers bumped from ^1.1.0 to ^1.1.1
    * @helia/utils bumped from ^0.3.2 to ^0.3.3

## [4.2.4](https://github.com/ipfs/helia/compare/helia-v4.2.3...helia-v4.2.4) (2024-06-18)


### Bug Fixes

* update circuit relay server args ([#561](https://github.com/ipfs/helia/issues/561)) ([3577d3d](https://github.com/ipfs/helia/commit/3577d3d106e255ff0d2a1d47a197f04632b903ec))

## [4.2.3](https://github.com/ipfs/helia/compare/helia-v4.2.2...helia-v4.2.3) (2024-05-27)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @helia/block-brokers bumped from ^3.0.1 to ^3.0.2
    * @helia/utils bumped from ^0.3.1 to ^0.3.2

## [4.2.2](https://github.com/ipfs/helia/compare/helia-v4.2.1...helia-v4.2.2) (2024-05-20)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @helia/block-brokers bumped from ^3.0.0 to ^3.0.1
    * @helia/utils bumped from ^0.3.0 to ^0.3.1

## [4.2.1](https://github.com/ipfs/helia/compare/helia-v4.2.0...helia-v4.2.1) (2024-05-02)


### Dependencies

* bump @libp2p/identify from 1.0.21 to 2.0.0 ([#528](https://github.com/ipfs/helia/issues/528)) ([9fa2427](https://github.com/ipfs/helia/commit/9fa2427fece28a4b4dc0980ae65480ff002a2bc6))
* The following workspace dependencies were updated
  * dependencies
    * @helia/block-brokers bumped from ^2.1.2 to ^3.0.0

## [4.2.0](https://github.com/ipfs/helia/compare/helia-v4.1.2...helia-v4.2.0) (2024-05-01)


### Features

* add metrics property to helia interface ([#512](https://github.com/ipfs/helia/issues/512)) ([f7f71bb](https://github.com/ipfs/helia/commit/f7f71bb20ab0b4efbe802be5af1189e76153b826))


### Bug Fixes

* http blockbroker loads gateways from routing ([#519](https://github.com/ipfs/helia/issues/519)) ([6a62d1c](https://github.com/ipfs/helia/commit/6a62d1c8dcfadead0498d0bb59958837dc204c91))
* remove rust bootstrapper ([#523](https://github.com/ipfs/helia/issues/523)) ([fa9bd4b](https://github.com/ipfs/helia/commit/fa9bd4b53702f3ae71b76a46549535b63629d820))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @helia/block-brokers bumped from ^2.1.1 to ^2.1.2
    * @helia/interface bumped from ^4.2.0 to ^4.3.0
    * @helia/routers bumped from ^1.0.3 to ^1.1.0
    * @helia/utils bumped from ^0.2.0 to ^0.3.0

## [4.1.2](https://github.com/ipfs/helia/compare/helia-v4.1.1...helia-v4.1.2) (2024-04-22)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @helia/block-brokers bumped from ^2.1.0 to ^2.1.1

## [4.1.1](https://github.com/ipfs/helia/compare/helia-v4.1.0...helia-v4.1.1) (2024-04-15)


### Bug Fixes

* add sideEffects: false to package.json ([#485](https://github.com/ipfs/helia/issues/485)) ([8c45267](https://github.com/ipfs/helia/commit/8c45267a474ab10b2faadfebdab33cfe446e8c03))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @helia/block-brokers bumped from ^2.0.3 to ^2.1.0
    * @helia/interface bumped from ^4.1.0 to ^4.2.0
    * @helia/routers bumped from ^1.0.2 to ^1.0.3
    * @helia/utils bumped from ^0.1.0 to ^0.2.0

## [4.1.0](https://github.com/ipfs/helia/compare/helia-v4.0.2...helia-v4.1.0) (2024-03-14)


### Features

* expose .dns property on @helia/interface ([#465](https://github.com/ipfs/helia/issues/465)) ([8c9bb7d](https://github.com/ipfs/helia/commit/8c9bb7d224a1b786cba1fba18bffe07001a3b95d))


### Bug Fixes

* helia init should extend base helia init ([#464](https://github.com/ipfs/helia/issues/464)) ([a64e5de](https://github.com/ipfs/helia/commit/a64e5de937fbbade035657a18e07bcad4de0a53f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @helia/block-brokers bumped from ^2.0.2 to ^2.0.3
    * @helia/interface bumped from ^4.0.1 to ^4.1.0
    * @helia/routers bumped from ^1.0.1 to ^1.0.2
    * @helia/utils bumped from ^0.0.2 to ^0.1.0

## [4.0.2](https://github.com/ipfs/helia/compare/helia-v4.0.1...helia-v4.0.2) (2024-02-28)


### Bug Fixes

* support reading identity cids ([#429](https://github.com/ipfs/helia/issues/429)) ([98308f7](https://github.com/ipfs/helia/commit/98308f77488b8196b2d18f78f05ecd2d37456834))
* update project deps and docs ([77e34fc](https://github.com/ipfs/helia/commit/77e34fc115cbfb82585fd954bcf389ecebf655bc))


### Dependencies

* update libp2p patch versions ([917a1bc](https://github.com/ipfs/helia/commit/917a1bceb9e9b56428a15dc3377a963f06affd12))
* The following workspace dependencies were updated
  * dependencies
    * @helia/block-brokers bumped from ^2.0.1 to ^2.0.2
    * @helia/interface bumped from ^4.0.0 to ^4.0.1
    * @helia/routers bumped from ^1.0.0 to ^1.0.1
    * @helia/utils bumped from ^0.0.1 to ^0.0.2

## [4.0.0](https://github.com/ipfs/helia/compare/helia-v3.0.1...helia-v4.0.0) (2024-01-24)


### ⚠ BREAKING CHANGES

* remove gossipsub from default libp2p services ([#401](https://github.com/ipfs/helia/issues/401))
* the `libp2p` property has been removed from the `Helia` interface in `@helia/interface` - it is still present on the return type of `createHelia` from the `helia` module

### Features

* add @helia/http to monorepo ([#372](https://github.com/ipfs/helia/issues/372)) ([76220cd](https://github.com/ipfs/helia/commit/76220cd5adf45af7fa61fd0a1321de4722b744d6))


### Bug Fixes

* add a test for reading the peer id from the datastore ([#397](https://github.com/ipfs/helia/issues/397)) ([4836d52](https://github.com/ipfs/helia/commit/4836d52bf721bc0c3e5920ebd0a05186fb19c6c6))
* ignore libp2p start param in helia factory ([#382](https://github.com/ipfs/helia/issues/382)) ([c8d2fac](https://github.com/ipfs/helia/commit/c8d2fac002ef73fc3eba83914de12d2e73074c64)), closes [#344](https://github.com/ipfs/helia/issues/344)
* remove gossipsub from default libp2p services ([#401](https://github.com/ipfs/helia/issues/401)) ([99c94f4](https://github.com/ipfs/helia/commit/99c94f4b85c4ed826a6195207e3545cbbc87a6d1))
* update ipns module to v9 and fix double verification of records ([#396](https://github.com/ipfs/helia/issues/396)) ([f2853f8](https://github.com/ipfs/helia/commit/f2853f8bd5bdcee8ab7a685355b0be47f29620e0))


### Dependencies

* bump @chainsafe/libp2p-noise from 14.1.0 to 15.0.0 ([#393](https://github.com/ipfs/helia/issues/393)) ([4943c5b](https://github.com/ipfs/helia/commit/4943c5b7e8779bc326ee156b1d80152225189343))
* The following workspace dependencies were updated
  * dependencies
    * @helia/block-brokers bumped from ^1.0.0 to ^2.0.0
    * @helia/interface bumped from ^3.0.1 to ^4.0.0
    * @helia/routers bumped from ^0.0.0 to ^1.0.0
    * @helia/utils bumped from ^0.0.0 to ^0.0.1

## [3.0.1](https://github.com/ipfs/helia/compare/helia-v3.0.0...helia-v3.0.1) (2024-01-09)


### Bug Fixes

* create @helia/block-brokers package ([#341](https://github.com/ipfs/helia/issues/341)) ([#342](https://github.com/ipfs/helia/issues/342)) ([2979147](https://github.com/ipfs/helia/commit/297914756fa06dc0c28890a2654d1159d16689c2))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @helia/block-brokers bumped from ~0.0.0 to ~1.0.0
    * @helia/interface bumped from ^3.0.0 to ^3.0.1

## [3.0.0](https://github.com/ipfs/helia/compare/helia-v2.1.0...helia-v3.0.0) (2024-01-07)


### ⚠ BREAKING CHANGES

* `helia.pin.add` and `helia.pin.rm` now return `AsyncGenerator<CID>`
* The libp2p API has changed in a couple of places - please see the [upgrade guide](https://github.com/libp2p/js-libp2p/blob/main/doc/migrations/v0.46-v1.0.0.md)

### deps

* updates to libp2p v1 ([#320](https://github.com/ipfs/helia/issues/320)) ([635d7a2](https://github.com/ipfs/helia/commit/635d7a2938111ccc53f8defbd9b8f8f8ea3e8e6a))


### Features

* iterable pinning ([#231](https://github.com/ipfs/helia/issues/231)) ([c15c774](https://github.com/ipfs/helia/commit/c15c7749294d3d4aea5aef70544d088250336798))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @helia/interface bumped from ^2.1.0 to ^3.0.0

## [2.1.0](https://www.github.com/ipfs/helia/compare/helia-v2.0.3...helia-v2.1.0) (2023-11-06)


### Features

* configurable block brokers ([#280](https://www.github.com/ipfs/helia/issues/280)) ([0749cbf](https://www.github.com/ipfs/helia/commit/0749cbf99745ea6ab4363f1b5d635634ca0ddcfa))
* GatewayBlockBroker prioritizes & tries all gateways ([#281](https://www.github.com/ipfs/helia/issues/281)) ([9bad21b](https://www.github.com/ipfs/helia/commit/9bad21bd59fe6d1ba4a137db5a46bd2ead5238c3))
* use trustless-gateway.link by default ([#299](https://www.github.com/ipfs/helia/issues/299)) ([bf11efa](https://www.github.com/ipfs/helia/commit/bf11efa4875f3b8f844511d70122983fc46b4f88))


### Bug Fixes

* listen on ip6 addresses ([#271](https://www.github.com/ipfs/helia/issues/271)) ([7ef5e79](https://www.github.com/ipfs/helia/commit/7ef5e79620f043522ff0dacc260af1fe83e5d77e))
* remove trustless-gateway.link ([#301](https://www.github.com/ipfs/helia/issues/301)) ([0343725](https://www.github.com/ipfs/helia/commit/03437255213b14f5931aed91e8555d7fb7f92926))
* replace IPNI gateway with delegated routing client ([#297](https://www.github.com/ipfs/helia/issues/297)) ([57d580d](https://www.github.com/ipfs/helia/commit/57d580da26c5e28852cc9fe4d0d80adb36699ece))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @helia/interface bumped from ^2.0.0 to ^2.1.0

### [2.0.3](https://www.github.com/ipfs/helia/compare/helia-v2.0.2...helia-v2.0.3) (2023-09-18)


### Bug Fixes

* export libp2p service return type ([#263](https://www.github.com/ipfs/helia/issues/263)) ([76769cf](https://www.github.com/ipfs/helia/commit/76769cf33e06746f998b4f16b52d3e2a6a7a20a8))
* try circuit relay transport first ([#267](https://www.github.com/ipfs/helia/issues/267)) ([d5e9c3c](https://www.github.com/ipfs/helia/commit/d5e9c3c45c8dc3e63969105b785f6a836820a1f8))
* update attempt to add helia to identify agent version ([#268](https://www.github.com/ipfs/helia/issues/268)) ([6dc7d55](https://www.github.com/ipfs/helia/commit/6dc7d55cd3099785417a7a2c99db755e856bd59a))

### [2.0.2](https://www.github.com/ipfs/helia/compare/helia-v2.0.1...helia-v2.0.2) (2023-09-14)


### Bug Fixes

* add dag walker for json codec ([#247](https://www.github.com/ipfs/helia/issues/247)) ([5c4b570](https://www.github.com/ipfs/helia/commit/5c4b5709e6b98de5efc9bed388942e367f5874e7)), closes [#246](https://www.github.com/ipfs/helia/issues/246)

### [2.0.1](https://www.github.com/ipfs/helia/compare/helia-v2.0.0...helia-v2.0.1) (2023-08-16)


### Bug Fixes

* enable dcutr by default ([#239](https://www.github.com/ipfs/helia/issues/239)) ([7431f09](https://www.github.com/ipfs/helia/commit/7431f09aef332dc142a5f7c2c59c9410e4529a92))

## [2.0.0](https://www.github.com/ipfs/helia/compare/helia-v1.3.12...helia-v2.0.0) (2023-08-16)


### ⚠ BREAKING CHANGES

* libp2p has been updated to 0.46.x

### Features

* re-export types from @helia/interface ([#232](https://www.github.com/ipfs/helia/issues/232)) ([09c1e47](https://www.github.com/ipfs/helia/commit/09c1e4787a506d34a00d9ce7852d73471d47db1b))

### Dependencies

* bump @libp2p/ipni-content-routing from 1.0.2 to 2.0.0 ([#227](https://www.github.com/ipfs/helia/issues/227)) ([a33cb3e](https://www.github.com/ipfs/helia/commit/a33cb3ef2dd21a55b598f206e8d4295935ea2bcc))
* update libp2p to 0.46.x ([#215](https://www.github.com/ipfs/helia/issues/215)) ([65b68f0](https://www.github.com/ipfs/helia/commit/65b68f071d04d2f6f0fcf35938b146706b1a3cd0))
* update sibling dependencies ([07847bb](https://www.github.com/ipfs/helia/commit/07847bb60b9ebd26497080373e45871abb4b82dd))

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @helia/interface bumped from ^1.0.0 to ^2.0.0

## [1.3.12](https://github.com/ipfs/helia/compare/helia-v1.3.11...helia-v1.3.12) (2023-08-05)


### Dependencies

* **dev:** bump aegir from 39.0.13 to 40.0.8 ([#198](https://github.com/ipfs/helia/issues/198)) ([4d75ecf](https://github.com/ipfs/helia/commit/4d75ecffb79e5177da35d3106e42dac7bc63153a))
* update sibling dependencies ([beb10b5](https://github.com/ipfs/helia/commit/beb10b5590d66d1d5bef9b5e890b888263df2c92))

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @helia/block-brokers bumped from ^2.0.0 to ^2.0.1

## [1.3.11](https://github.com/ipfs/helia/compare/helia-v1.3.10...helia-v1.3.11) (2023-08-04)


### Dependencies

* update sibling dependencies ([aa249bc](https://github.com/ipfs/helia/commit/aa249bca021ca513c7847331970219e4a36dee97))

## [1.3.10](https://github.com/ipfs/helia/compare/helia-v1.3.9...helia-v1.3.10) (2023-08-04)


### Dependencies

* update sibling dependencies ([89df3fe](https://github.com/ipfs/helia/commit/89df3fe803daa3228290bef105ce5d0b769dc3a0))

## [1.3.9](https://github.com/ipfs/helia/compare/helia-v1.3.8...helia-v1.3.9) (2023-08-01)


### Dependencies

* update sibling dependencies ([0970da7](https://github.com/ipfs/helia/commit/0970da79e974a4c172e8fdfb7c207d5ba8152a83))

## [1.3.8](https://github.com/ipfs/helia/compare/helia-v1.3.7...helia-v1.3.8) (2023-07-14)


### Dependencies

* update sibling dependencies ([5850e51](https://github.com/ipfs/helia/commit/5850e513c486f6d20e23c04936bbf843653cb5e4))

## [1.3.7](https://github.com/ipfs/helia/compare/helia-v1.3.6...helia-v1.3.7) (2023-07-11)


### Dependencies

* update sibling dependencies ([2c52da3](https://github.com/ipfs/helia/commit/2c52da3957d56fe4e3ff6f161f9bec814abd5d8c))

## [1.3.6](https://github.com/ipfs/helia/compare/helia-v1.3.5...helia-v1.3.6) (2023-07-10)


### Dependencies

* update sibling dependencies ([9139f30](https://github.com/ipfs/helia/commit/9139f30e857f4e247202e0d113027190a04892ba))

## [1.3.5](https://github.com/ipfs/helia/compare/helia-v1.3.4...helia-v1.3.5) (2023-07-04)


### Dependencies

* update sibling dependencies ([99a5115](https://github.com/ipfs/helia/commit/99a5115713d2f17f17820f661dd22a87262c654b))


### Trivial Changes

* update project config ([#175](https://github.com/ipfs/helia/issues/175)) ([f185a72](https://github.com/ipfs/helia/commit/f185a7220a62f7fc0c025aa5c0be5a981c63cc48))

## [1.3.4](https://github.com/ipfs/helia/compare/helia-v1.3.3...helia-v1.3.4) (2023-06-26)


### Dependencies

* update sibling dependencies ([64e300c](https://github.com/ipfs/helia/commit/64e300c289f4bfe4b72607d86ab9e83a1ac3c8d3))

## [1.3.3](https://github.com/ipfs/helia/compare/helia-v1.3.2...helia-v1.3.3) (2023-06-21)


### Dependencies

* update sibling dependencies ([f7cb076](https://github.com/ipfs/helia/commit/f7cb076e9356535164812229eff22c5c0e052674))

## [1.3.2](https://github.com/ipfs/helia/compare/helia-v1.3.1...helia-v1.3.2) (2023-06-10)


### Dependencies

* update sibling dependencies ([634ca4f](https://github.com/ipfs/helia/commit/634ca4faf5caf448bd068a78101ac0070145518e))

## [1.3.1](https://github.com/ipfs/helia/compare/helia-v1.3.0...helia-v1.3.1) (2023-06-07)


### Bug Fixes

* pass options to blockstore.get during pin.add ([#148](https://github.com/ipfs/helia/issues/148)) ([3a5234e](https://github.com/ipfs/helia/commit/3a5234e3c2f88f9910678b0cbbac5fd340117cc9))
* remove extra interface ([d577c61](https://github.com/ipfs/helia/commit/d577c61bcc6e4805d214b3ec4a39d78ee752a21e))


### Dependencies

* update sibling dependencies ([3323a5c](https://github.com/ipfs/helia/commit/3323a5cd518c63cb67e8eaef0cb64c542982b603))

## [1.3.0](https://github.com/ipfs/helia/compare/helia-v1.2.2...helia-v1.3.0) (2023-06-07)


### Features

* add offline option to blockstore get ([#145](https://github.com/ipfs/helia/issues/145)) ([71c5f6b](https://github.com/ipfs/helia/commit/71c5f6bc32b324ee237e56c2c5a1ce903b3bdbef))


### Dependencies

* update sibling dependencies ([671ec87](https://github.com/ipfs/helia/commit/671ec874e90fbdcaf79d9d8253822fd85cee8bc5))

## [1.2.2](https://github.com/ipfs/helia/compare/helia-v1.2.1...helia-v1.2.2) (2023-06-07)


### Dependencies

* update sibling dependencies ([a349576](https://github.com/ipfs/helia/commit/a34957650715efc45382dc005feea6162398b8f9))


### Trivial Changes

* update changelogs ([#142](https://github.com/ipfs/helia/issues/142)) ([fefd374](https://github.com/ipfs/helia/commit/fefd3744c0a6d8471de31762ece6ec59b65496c1))

## [1.2.1](https://github.com/ipfs/helia/compare/helia-v1.2.0...helia-v1.2.1) (2023-06-01)


### Bug Fixes

* ensure pinned blocks are present ([#141](https://github.com/ipfs/helia/issues/141)) ([271c403](https://github.com/ipfs/helia/commit/271c403009d378a35375a9468e41388ebb978f54))


### Dependencies

* update sibling dependencies ([fcee11e](https://github.com/ipfs/helia/commit/fcee11eadb7edfa327e3f0bd586e20ea5dc06c8a))

## [1.2.0](https://github.com/ipfs/helia/compare/helia-v1.1.5...helia-v1.2.0) (2023-06-01)


### Features

* allow passing partial libp2p config to helia factory ([#140](https://github.com/ipfs/helia/issues/140)) ([33a75d5](https://github.com/ipfs/helia/commit/33a75d5f80e2f211440c087806f463525de910d9))


### Dependencies

* update sibling dependencies ([c936ba6](https://github.com/ipfs/helia/commit/c936ba63a75276e206d804cf0ef35c3f9bf67f10))

## [1.1.5](https://github.com/ipfs/helia/compare/helia-v1.1.4...helia-v1.1.5) (2023-05-25)


### Bug Fixes

* add dht validators/selectors for ipns ([#135](https://github.com/ipfs/helia/issues/135)) ([2c8e6b5](https://github.com/ipfs/helia/commit/2c8e6b51b3c401a0472a024b8dac3d3ba735d74c))


### Dependencies

* update sibling dependencies ([f565ffd](https://github.com/ipfs/helia/commit/f565ffdcf6923b78326ed4cb00be93083b45ccca))

## [1.1.4](https://github.com/ipfs/helia/compare/helia-v1.1.3...helia-v1.1.4) (2023-05-24)


### Dependencies

* update sibling dependencies ([1ac389c](https://github.com/ipfs/helia/commit/1ac389c6fd8f276daf33c8a61849f3657cf88a10))

## [1.1.3](https://github.com/ipfs/helia/compare/helia-v1.1.2...helia-v1.1.3) (2023-05-24)


### Dependencies

* **dev:** bump delay from 5.0.0 to 6.0.0 ([#130](https://github.com/ipfs/helia/issues/130)) ([d087ffc](https://github.com/ipfs/helia/commit/d087ffcb8074b41781346d09101b2b7bc64768d2))
* update sibling dependencies ([ed49856](https://github.com/ipfs/helia/commit/ed4985677b62021f76541354ad06b70bd53e929a))

## [1.1.2](https://github.com/ipfs/helia/compare/helia-v1.1.1...helia-v1.1.2) (2023-05-19)


### Bug Fixes

* dedupe bootstrap list ([#129](https://github.com/ipfs/helia/issues/129)) ([bb5d1e9](https://github.com/ipfs/helia/commit/bb5d1e91daae9f6c399e0fdf974318a4a7353fb9)), closes [/github.com/ipfs/helia/pull/127#discussion_r1199152374](https://github.com/ipfs//github.com/ipfs/helia/pull/127/issues/discussion_r1199152374)


### Dependencies

* update sibling dependencies ([d33c843](https://github.com/ipfs/helia/commit/d33c84378c02f34277178e6553090b92b0eabe0b))

## [1.1.1](https://github.com/ipfs/helia/compare/helia-v1.1.0...helia-v1.1.1) (2023-05-19)


### Bug Fixes

* add helia version to agent version ([#128](https://github.com/ipfs/helia/issues/128)) ([48e19ec](https://github.com/ipfs/helia/commit/48e19ec545cc67157e14ae59054fa377a583cb01)), closes [#122](https://github.com/ipfs/helia/issues/122)

## [1.1.0](https://github.com/ipfs/helia/compare/helia-v1.0.4...helia-v1.1.0) (2023-05-19)


### Features

* provide default libp2p instance ([#127](https://github.com/ipfs/helia/issues/127)) ([45c9d89](https://github.com/ipfs/helia/commit/45c9d896afa27f5ea043cc5f576d50fc4fa556e9)), closes [#121](https://github.com/ipfs/helia/issues/121)

## [1.0.4](https://github.com/ipfs/helia/compare/helia-v1.0.3...helia-v1.0.4) (2023-05-04)


### Bug Fixes

* **types:** Add missing types ([#95](https://github.com/ipfs/helia/issues/95)) ([e858b8d](https://github.com/ipfs/helia/commit/e858b8dbbff548b42dde225db674f0edd1990ed3))


### Dependencies

* **dev:** bump libp2p from 0.43.4 to 0.44.0 ([#96](https://github.com/ipfs/helia/issues/96)) ([6e37d9f](https://github.com/ipfs/helia/commit/6e37d9f8be58955c5ddc5472fe3adb4bd9a0459c))


### Trivial Changes

* bump aegir from 38.1.8 to 39.0.4 ([#111](https://github.com/ipfs/helia/issues/111)) ([2156568](https://github.com/ipfs/helia/commit/215656870cb821dd6be2f8054dc39932ba25af14))

## [1.0.3](https://github.com/ipfs/helia/compare/helia-v1.0.2...helia-v1.0.3) (2023-04-05)


### Dependencies

* bump it-filter from 2.0.2 to 3.0.1 ([#74](https://github.com/ipfs/helia/issues/74)) ([3402724](https://github.com/ipfs/helia/commit/340272484df47d2f70f870d375ebb4235fb165a0))

## [1.0.2](https://github.com/ipfs/helia/compare/helia-v1.0.1...helia-v1.0.2) (2023-04-05)


### Dependencies

* bump it-drain from 2.0.1 to 3.0.1 ([#71](https://github.com/ipfs/helia/issues/71)) ([c6eaca1](https://github.com/ipfs/helia/commit/c6eaca1d21cf16527851fffc2411a8e3bd651f34))

## [1.0.1](https://github.com/ipfs/helia/compare/helia-v1.0.0...helia-v1.0.1) (2023-04-05)


### Dependencies

* bump it-all from 2.0.1 to 3.0.1 ([#72](https://github.com/ipfs/helia/issues/72)) ([e7ce5bc](https://github.com/ipfs/helia/commit/e7ce5bc0e0db0a6b41920a3c36b95eeea1863183))
* bump it-foreach from 1.0.1 to 2.0.2 ([#75](https://github.com/ipfs/helia/issues/75)) ([6f5f059](https://github.com/ipfs/helia/commit/6f5f0592edd44257092d0b70dd364096864495bf))

## 1.0.0 (2023-03-23)


### Features

* add bitswap progress events ([#50](https://github.com/ipfs/helia/issues/50)) ([7460719](https://github.com/ipfs/helia/commit/7460719be44b4ff9bad629654efa29c56242e03a)), closes [#27](https://github.com/ipfs/helia/issues/27)
* add pinning API ([#36](https://github.com/ipfs/helia/issues/36)) ([270bb98](https://github.com/ipfs/helia/commit/270bb988eb8aefc8afe68e3580c3ef18960b3188)), closes [#28](https://github.com/ipfs/helia/issues/28) [/github.com/ipfs/helia/pull/36#issuecomment-1441403221](https://github.com/ipfs//github.com/ipfs/helia/pull/36/issues/issuecomment-1441403221) [#28](https://github.com/ipfs/helia/issues/28)
* initial implementation ([#17](https://github.com/ipfs/helia/issues/17)) ([343d360](https://github.com/ipfs/helia/commit/343d36016b164ed45cec4eb670d7f74860166ce4))


### Bug Fixes

* make all helia args optional ([#37](https://github.com/ipfs/helia/issues/37)) ([d15d76c](https://github.com/ipfs/helia/commit/d15d76cdc40a31bd1e47ca09583cc685583243b9))
* survive a cid causing an error during gc ([#38](https://github.com/ipfs/helia/issues/38)) ([5330188](https://github.com/ipfs/helia/commit/53301881dc6226ea3fc6823fd6e298e4d4796408))
* update blocks interface to align with interface-blockstore ([#54](https://github.com/ipfs/helia/issues/54)) ([202b966](https://github.com/ipfs/helia/commit/202b966df3866d449751f775ed3edc9c92e32f6a))
* use release version of libp2p ([#59](https://github.com/ipfs/helia/issues/59)) ([a3a7c9c](https://github.com/ipfs/helia/commit/a3a7c9c2d81f2068fee85eeeca7425919f09e182))


### Trivial Changes

* add release config ([a1c7ed0](https://github.com/ipfs/helia/commit/a1c7ed0560aaab032b641a78c9a76fc05a691a10))
* fix ci badge ([50929c0](https://github.com/ipfs/helia/commit/50929c01a38317f2f580609cc1b9c4c5485f32c8))
* release main ([#62](https://github.com/ipfs/helia/issues/62)) ([2bce77c](https://github.com/ipfs/helia/commit/2bce77c7d68735efca6ba602c215f432ba9b722d))
* update logo ([654a70c](https://github.com/ipfs/helia/commit/654a70cff9c222e4029ddd183d609514afc852ed))
* update publish config ([913ab6a](https://github.com/ipfs/helia/commit/913ab6ae9a2970c4b908de04b8b6a236b931a3b0))
* update release please config ([b52d5e3](https://github.com/ipfs/helia/commit/b52d5e3eecce41b10640426c339c99ad14ce874e))
* use wildcards for interop test deps ([29b4fb0](https://github.com/ipfs/helia/commit/29b4fb0ef58f53e6f7e1cf6fcb78fbb699f7b2a7))


### Dependencies

* update interface-store to 5.x.x ([#63](https://github.com/ipfs/helia/issues/63)) ([5bf11d6](https://github.com/ipfs/helia/commit/5bf11d638eee423624ac49af97757d730744f384))
* update sibling dependencies ([ac28d38](https://github.com/ipfs/helia/commit/ac28d3878f98a780fc57702921924fa92bd592a0))

## helia-v0.1.0 (2023-03-22)


### Features

* add bitswap progress events ([#50](https://www.github.com/ipfs/helia/issues/50)) ([7460719](https://www.github.com/ipfs/helia/commit/7460719be44b4ff9bad629654efa29c56242e03a)), closes [#27](https://www.github.com/ipfs/helia/issues/27)
* add pinning API ([#36](https://www.github.com/ipfs/helia/issues/36)) ([270bb98](https://www.github.com/ipfs/helia/commit/270bb988eb8aefc8afe68e3580c3ef18960b3188)), closes [#28](https://www.github.com/ipfs/helia/issues/28)
* initial implementation ([#17](https://www.github.com/ipfs/helia/issues/17)) ([343d360](https://www.github.com/ipfs/helia/commit/343d36016b164ed45cec4eb670d7f74860166ce4))


### Bug Fixes

* make all helia args optional ([#37](https://www.github.com/ipfs/helia/issues/37)) ([d15d76c](https://www.github.com/ipfs/helia/commit/d15d76cdc40a31bd1e47ca09583cc685583243b9))
* survive a cid causing an error during gc ([#38](https://www.github.com/ipfs/helia/issues/38)) ([5330188](https://www.github.com/ipfs/helia/commit/53301881dc6226ea3fc6823fd6e298e4d4796408))
* update blocks interface to align with interface-blockstore ([#54](https://www.github.com/ipfs/helia/issues/54)) ([202b966](https://www.github.com/ipfs/helia/commit/202b966df3866d449751f775ed3edc9c92e32f6a))
* use release version of libp2p ([#59](https://www.github.com/ipfs/helia/issues/59)) ([a3a7c9c](https://www.github.com/ipfs/helia/commit/a3a7c9c2d81f2068fee85eeeca7425919f09e182))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @helia/interface bumped from ~0.0.0 to ^0.1.0
