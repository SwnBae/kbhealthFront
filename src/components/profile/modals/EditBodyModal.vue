<template>
  <div class="modal" @click.self="$emit('close')">
    <div class="modal-content">
      <h3>신체정보 수정</h3>
      <form @submit.prevent="handleSubmit">
        <label>키(cm): <input type="number" v-model.number="localEditBodyInfo.height" required /></label><br/>
        <label>몸무게(kg): <input type="number" v-model.number="localEditBodyInfo.weight" required /></label><br/>
        <label>성별:
          <select v-model="localEditBodyInfo.gender" required>
            <option disabled value="">선택</option>
            <option value="MALE">남성</option>
            <option value="FEMALE">여성</option>
          </select>
        </label><br/>
        <label>나이: <input type="number" v-model.number="localEditBodyInfo.age" required /></label><br/>
        <button type="submit">저장</button>
        <button type="button" @click="$emit('close')">취소</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import {ref, watch} from 'vue';

const props = defineProps({
  editBodyInfo: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close', 'submit', 'update:editBodyInfo']);

// props의 복사본을 로컬 상태로 사용
const localEditBodyInfo = ref({...props.editBodyInfo});

// props가 변경되면 로컬 상태도 업데이트
watch(() => props.editBodyInfo, (newValue) => {
  localEditBodyInfo.value = {...newValue};
}, {deep: true});

// 폼 제출 처리
const handleSubmit = () => {
  // 변경된 값을 부모에게 알리고 submit 이벤트 발생
  emit('update:editBodyInfo', localEditBodyInfo.value);
  emit('submit');
};
</script>

<style scoped>
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;

  /* fade-in animation */
  animation: fadeIn 0.3s ease-out;
}

.modal-content {
  background-color: white;
  padding: 2rem;
  border-radius: 8px;
  width: 80%;
  max-width: 500px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);

  /* scale-up animation */
  animation: popIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-content form label {
  display: block;
  margin-bottom: 1rem;
  font-size: 0.95rem;
  color: #444;
}

.modal-content input,
.modal-content select {
  width: 100%;
  padding: 0.5rem;
  margin-top: 0.3rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

.modal-content button {
  margin-top: 1rem;
  margin-right: 0.5rem;
  padding: 0.6rem 1.2rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
}

.modal-content button[type="button"] {
  background-color: #ccc;
  color: #333;
}
</style>