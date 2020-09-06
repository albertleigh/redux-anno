const ID_PREFIX = 'Ä';

class IdGenerator {
  private current = 1 as number;
  private regEx = new RegExp(`^${ID_PREFIX}[0-9]+$`);

  public getNextId(): string {
    return `${ID_PREFIX}${this.current++ % Number.MAX_SAFE_INTEGER}`;
  }

  public isId(id: string): boolean {
    return !!id.match(this.regEx);
  }
}

export default new IdGenerator();
