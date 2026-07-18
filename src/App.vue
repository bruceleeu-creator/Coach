<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { AuthService } from './services/auth'
import { CloudSyncService } from './services/cloud-sync'
import { PreferenceService } from './services/preferences'

onLaunch(async () => {
  PreferenceService.applyTheme()
  await AuthService.hydrateSession()
  await CloudSyncService.pullAndMerge()
  console.log('你的内在空间 H5 启动')
})
</script>

<style lang="scss">
@import './uni.scss';
</style>
