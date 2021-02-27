class IdGenerator {
  static instance: IdGenerator = new IdGenerator();

  private current = Math.floor(Math.random() * 65534);

  constructor() {
    if (!!IdGenerator.instance) {
      throw new Error('Cannot creat two IdGenerators');
    }
  }

  nextId(): number {
    this.current = (this.current + 1) % 65535;
    return this.current;
  }
}

export default IdGenerator.instance;
