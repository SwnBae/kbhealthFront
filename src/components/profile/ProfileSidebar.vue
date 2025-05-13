<!-- components/ProfileSidebar.vue -->
<template>
  <aside class="profile-sidebar">
    <ProfileInfoCard
        :profile="profile"
        :isCurrentUser="isCurrentUser"
        @edit-info="$emit('edit-info')"
        @edit-body="$emit('edit-body')"
        @toggle-follow="$emit('toggle-follow')"
        @open-follow-modal="$emit('open-follow-modal', $event)"
    />

    <!-- 그래프 영역 -->
    <ProfileGraphs :profile="profile" />
  </aside>
</template>

<script setup>
import ProfileInfoCard from './ProfileInfoCard.vue';
import ProfileGraphs from './ProfileGraphs.vue';

defineProps({
  profile: {
    type: Object,
    required: true
  },
  isCurrentUser: {
    type: Boolean,
    default: false
  }
});

defineEmits(['edit-info', 'edit-body', 'toggle-follow', 'open-follow-modal']);
</script>

<style scoped>
.profile-sidebar {
  width: 30%;
  height: 80vh;
  overflow-y: auto;
  padding-right: 1rem;
}
</style>