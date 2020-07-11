
const ID_PREFIX = 'Ä';

class IdGenerator{
    private current:number = 1;
    private regEx = new RegExp(`^${ID_PREFIX}[0-9]+$`)

    public getNextId():string{
        return `${ID_PREFIX}${(this.current++)%Number.MAX_SAFE_INTEGER}`
    }

    public isId(id:string):boolean{
        return !!id.match(this.regEx)
    }
}

export default new IdGenerator();
