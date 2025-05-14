<template>
  <div class="app">
    <div v-if="state.currentMember.id">
      <p>안녕하세요? {{ state.currentMember.name }}님!</p>
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
import {reactive} from "vue";
import {useRouter} from "vue-router";

export default {
  setup() {
    const router = useRouter();
    const state = reactive({
      currentMember: { id: 0, account: "" },
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
          .then((response) => {
            // 서버에서 응답 받은 데이터 처리
            const { message, redirect } = response.data;  // message와 redirect 추출
            alert(message);  // 메시지 표시

            if (redirect) {
              router.push("/feed").then(() => {
                location.reload();  // 경로 변경 후 강제로 새로 고침
              });
            }

            // 로그인 상태 업데이트
            state.currentMember = {
              id: response.data.id,
              account: response.data.account,
            };
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
            state.currentMember = { id: 0, account: "" };
          })
          .catch(() => {
            alert("로그아웃 중 오류가 발생했습니다.");
          });
    };

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
