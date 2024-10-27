export class Block {
  public rpc: string;

  constructor(rpc: string) {
    this.rpc = rpc;
  }

  getRpc() {
    console.log(this.rpc);
  }
}