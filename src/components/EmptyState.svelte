<script lang="ts">
  let { onpick }: { onpick: (text: string) => void } = $props()
  const samples = ['吃藥', '換濾心', '換瓦斯', '打電話給爸媽', '剪頭髮', '繳帳單']
</script>

<div class="empty">
  <p>記下你上次做某件事的時間，之後一眼就知道過了幾天。</p>
  <p class="muted">在下面輸入一件事，按完成就記下第一筆。</p>
  <div class="chips">
    {#each samples as s (s)}
      <button class="btn" onclick={() => onpick(s)}>{s}</button>
    {/each}
  </div>
</div>

<style>
  .empty { padding: 3rem 1.5rem; text-align: center; }
  .chips { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; margin-top: 1rem; }
</style>
