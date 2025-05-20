<template>
  <div class="cart">
    <div class="container">
      <ul>
        <li v-for="(i, idx) in items" :key="idx">
          <img :src="i.imgPath"/>
          <span class="name">{{ i.name }}</span>
          <span class="price">{{ lib.getNumberFormatted(i.price - i.price * i.discountPer / 100) }}원</span>
          <i class="fa fa-trash" @click="remove(i.id)"></i>
        </li>
      </ul>
      <router-link to="/order" class="btn btn-primary">구입하기</router-link>
    </div>
  </div>
</template>

<script setup>
import { reactive, toRefs } from "vue";
import axios from "axios";
import lib from "@/scripts/lib";

const state = reactive({
  items: []
});

// toRefs를 사용하여 reactive 객체의 속성을 반응형으로 분해
const { items } = toRefs(state);

const load = () => {
  axios.get("/api/cart/items").then(({data}) => {
    console.log(data);
    state.items = data;
  });
};

const remove = (itemId) => {
  axios.delete(`/api/cart/items/${itemId}`).then(() => {
    load();
  });
};

// 컴포넌트 마운트 시 호출
load();
</script>

<style scoped>
.cart ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.cart ul li {
  border: 1px solid #eee;
  margin-top: 25px;
  margin-bottom: 25px;
}

.cart ul li img {
  width: 150px;
  height: 150px;
}

.cart ul li .name {
  margin-left: 25px;
}

.cart ul li .price {
  margin-left: 25px;
}

.cart ul li i {
  float: right;
  font-size: 20px;
  margin-top: 65px;
  margin-right: 50px;
}

.cart .btn {
  width:300px;
  display:block;
  margin:0 auto;
  padding:30px 50px;
  font-size: 20px;
}
</style>