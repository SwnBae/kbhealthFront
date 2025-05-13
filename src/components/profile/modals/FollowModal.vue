<template>
  <div class="modal" @click.self="$emit('close')">
    <div class="modal-content">
      <h3>{{ title }} 목록</h3>
      <ul>
        <li
            v-for="user in followList"
            :key="user.followId"
            @click="$emit('go-to-profile', user.account)"
        >
          <img :src="user.profileImageUrl" alt="profile image" class="modal-profile-image" />
          <span>{{ user.userName }} | 총 점수: {{ user.totalScore }} | 최근 10일 점수: {{ user.baseScore }}</span>
        </li>
      </ul>
      <button @click="$emit('close')">닫기</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  followList: {
    type: Array,
    default: () => []
  }
});

defineEmits(['close', 'go-to-profile']);
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


.modal-profile-image {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 10px;
  vertical-align: middle;
}

.modal li {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
}

.modal li:hover {
  background-color: #f0f0f0;
}

.modal ul {
  list-style: none;
  padding: 0;
}

.modal button {
  display: block;
  margin: 1rem auto 0;
  padding: 0.6rem 1.2rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
}
</style>