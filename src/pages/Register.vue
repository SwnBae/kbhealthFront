<template>
  <div class="app">
    <h3>회원가입</h3>
    <label for="regAccount">
      <span>아이디</span>
      <input type="text" id="regAccount" v-model="form.regAccount"/>
    </label>
    <label for="regPw">
      <span>패스워드</span>
      <input type="password" id="regPw" v-model="form.regPw"/>
    </label>
    <label for="regUserName">
      <span>닉네임</span>
      <input type="text" id="regUserName" v-model="form.regUserName"/>
    </label>
    <label for="regHeight">
      <span>키</span>
      <input type="number" id="regHeight" v-model="form.regHeight"/>
    </label>
    <label for="regWeight">
      <span>몸무게</span>
      <input type="number" id="regWeight" v-model="form.regWeight"/>
    </label>
    <label for="regGender">
      <span>성별</span>
      <select id="regGender" v-model="form.regGender">
        <option value="MALE">남성</option>
        <option value="FEMALE">여성</option>
      </select>
    </label>
    <label for="regAge">
      <span>나이</span>
      <input type="number" id="regAge" v-model="form.regAge"/>
    </label>
    <hr/>
    <button @click="register()">회원가입</button>
  </div>
</template>

<script>
import axios from "axios";
import {reactive} from "vue";
import {useRouter} from "vue-router";

export default {
  setup() {
    const router = useRouter(); // 추가
    const form = reactive({
      regAccount: "",
      regPw: "",
      regUserName: "",
      regHeight: "",
      regWeight: "",
      regGender: "MALE",
      regAge: "",
    });

    const register = () => {
      const args = {
        account: form.regAccount,
        password: form.regPw,
        userName: form.regUserName,
        height: form.regHeight,
        weight: form.regWeight,
        gender: form.regGender,
        age: form.regAge,
      };

      axios
          .post("/api/auth/regist", args)
          .then(() => {
            alert("회원가입에 성공했습니다.");
            router.push("/login"); // 메인으로 이동
          })
          .catch(() => {
            alert("회원가입에 실패했습니다. 입력 정보를 확인해주세요.");
          });
    };

    return {form, register};
  },
};
</script>


<style scoped>
.app {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  font-family: Arial, sans-serif;
}

label {
  display: block;
  margin-bottom: 1rem;
}

label span {
  display: block;
  font-weight: bold;
  margin-bottom: 0.25rem;
}

input,
select {
  width: 100%;
  padding: 0.5rem;
  font-size: 1rem;
  box-sizing: border-box;
}

button {
  width: 100%;
  padding: 0.75rem;
  margin-top: 1rem;
  font-size: 1rem;
  background-color: #0d6efd;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #0b5ed7;
}

hr {
  margin: 2rem 0;
  border: 0;
  border-top: 1px solid #ccc;
}

p {
  font-size: 1.1rem;
  font-weight: 500;
}
</style>
  