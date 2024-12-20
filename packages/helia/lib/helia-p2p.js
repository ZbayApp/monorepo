import { Helia } from '@helia/utils';
export class HeliaP2P extends Helia {
    constructor(init) {
        super({
            ...init,
            components: {
                libp2p: init.libp2p,
            },
        });
        this.libp2p = init.libp2p;
    }
    async start() {
        await super.start();
        await this.libp2p.start();
    }
    async stop() {
        await super.stop();
        await this.libp2p.stop();
    }
}
