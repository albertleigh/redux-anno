<template>
  <div>
    Global Counter {{counterVal}}
    <Button type="primary" @click="updateCounterVal(counterVal+1)">UP</Button>
    <Button type="secondary" @click="updateCounterVal(counterVal-1)">DOWN</Button>
  </div>

</template>

<script lang="ts">
import {mapState} from 'redux-vuex';
import {getContext} from 'redux-anno';
import {Button} from "ant-design-vue";
import {Counter as CounterModel} from 'sample-shared-models';
const defaultCtx = getContext();
const counterInst = defaultCtx.getOneInstance(CounterModel);

export default {
  name: "Global Counter",
  components:{
    Button
  },
  methods:{
    updateCounterVal(nextVal:number){
      counterInst.updateCount.dispatch(nextVal);
    }
  },
  setup(){
    return mapState({
      counterVal:()=>counterInst.count.value
    })
  }
}
</script>