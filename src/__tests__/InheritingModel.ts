import {putResolve} from 'redux-saga/effects'

import {STATE_KEYS_FIELD} from '../base';
import {Model, ModelContext, createModelContext} from '../model'
import {State, createState, getStateProperty} from '../state';
import {Saga} from '../saga';

import {getContext} from '../AnnoContext';

import {initReduxAnno} from '../store'

class GrandPaModel{
    grandPaStr:string = "grandPaStr"
}

class PapaModel extends GrandPaModel{
    @State parentNum = createState<number>();
    @State parentStr = createState("str0" as string);

    @ModelContext ctx = createModelContext(PapaModel);

    @Saga()
    * parentSaga(nextState:number){
        yield putResolve(this.ctx.parentNum.create(nextState));
        yield putResolve(this.ctx.parentStr.create(`str${nextState}`));
        return 'Yoo~ parent~';
    }
}

@Model()
class ChildModel extends PapaModel{
    @State oneStateNum = createState<number>();
    @State oneStateStr = createState("str0" as string);

    nonStateNum: number
    nonStateArr: Array<string>

    @ModelContext ctx = createModelContext(ChildModel);

    constructor() {
        super();
    }

    @Saga()
    * oneSaga(nextState:number){
        yield putResolve(this.ctx.oneStateNum.create(1));
        yield putResolve(this.ctx.oneStateStr.create('str1'));
        // yield putResolve(this.ctx.secondSaga.create());
        return 'Yoo~ one~';
    }

    @Saga()
    * secondSaga(){
        yield putResolve(this.ctx.oneStateNum.create(2));
        yield putResolve(this.ctx.oneStateStr.create('str2'));
        yield* this.parentSaga(2);
    }

}

describe("InheritingModel", ()=>{

    beforeAll(()=>{
        initReduxAnno({
            entryModel: ChildModel,
            contexts:{
                subStore1: {
                    entryModel: ChildModel
                }
            }
        });
    })

    it("Inheriting 01", async ()=>{

        const defaultCtx = getContext();
        const subCtx1 = getContext('subStore1');

        expect((GrandPaModel as any)[STATE_KEYS_FIELD]).toBeFalsy();
        expect((PapaModel as any)[STATE_KEYS_FIELD]).toBeTruthy();
        expect((PapaModel as any)[STATE_KEYS_FIELD].size).toBe(2);
        expect((ChildModel as any)[STATE_KEYS_FIELD]).toBeTruthy();
        expect((ChildModel as any)[STATE_KEYS_FIELD].size).toBe(4);

        const someInst = defaultCtx.getOneInstance(ChildModel);

        expect(someInst.oneStateNum).toBe(undefined)
        expect(someInst.oneStateStr).toBe('str0')
        expect(someInst.grandPaStr).toBe('grandPaStr')

        await someInst.oneSaga.dispatch(1);

        expect(someInst.oneStateNum).toBe(1)
        expect(someInst.oneStateStr).toBe('str1')

        //-----------------------------------------------------------------------------------------

        await someInst.parentSaga.dispatch(3);
        expect(someInst.parentNum).toBe(3)
        expect(someInst.parentStr).toBe('str3')

        //-----------------------------------------------------------------------------------------

        const someSubInst = subCtx1.getOneInstance(ChildModel);

        expect(someSubInst.oneStateNum).toBe(undefined)
        expect(someSubInst.oneStateStr).toBe('str0')

        await someSubInst.secondSaga.dispatch();

        expect(someSubInst.oneStateNum).toBe(2)
        expect(someSubInst.oneStateStr).toBe('str2')
        expect(someSubInst.parentNum).toBe(2)
        expect(someSubInst.parentStr).toBe('str2')

    })

})

