<template>
  <div class="app">
    <div v-if="state.account.id">
      <p>안녕하세요? {{ state.account.name }}님!</p>
      <button @click="logout()">로그아웃</button>
    </div>
    <div v-else>
      <label for="loginId">
        <span>아이디</span>
        <input type="text" id="loginId" v-model="state.form.loginId" />
      </label>
      <label for="loginPw">
        <span>패스워드</span>
        <input type="password" id="loginPw" v-model="state.form.loginPw" />
      </label>
      <hr />
      <button @click="submit()">로그인</button>
      <router-link to="/register">
        <button>회원가입</button>
      </router-link>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import { reactive } from "vue";

export default {
  setup() {
    const state = reactive({
      account: { id: null, name: "" },
      form: {
        loginId: "",
        loginPw: "",
      },
    });

    const submit = () => {
      const args = {
        account: state.form.loginId,
        password: state.form.loginPw,
      };

      axios
        .post("/api/auth/login", args)
        .then(() => {
          alert("로그인에 성공했습니다.");
          state.account = { id: 1, name: state.form.loginId }; // 예시
        })
        .catch(() => {
          alert("로그인에 실패했습니다. 계정 정보를 확인해주세요.");
        });
    };

    const logout = () => {
      axios
        .get("/api/auth/logout")
        .then(() => {
          alert("로그아웃하였습니다.");
          state.account = { id: null, name: "" };
        })
        .catch(() => {
          alert("로그아웃 중 오류가 발생했습니다.");
        });
    };

    const checkLoginStatus = () => {
      axios
        .get("/api/account")
        .then((res) => {
          if (res.data) {
            state.account = res.data;
          }
        })
        .catch(() => {
          console.log("로그인 상태 확인 실패");
        });
    };

    checkLoginStatus();

    return { state, submit, logout };
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
