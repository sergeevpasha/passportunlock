/** For lists drawn with plain links instead of `NuxtLink`: one listener on the list keeps an unmodified left click on
 * a link inside the app, and every other click behaves like any link. */
export function followLink(event: MouseEvent) {
  const link = (event.target as Element).closest('a');
  const href = link?.getAttribute('href');
  if (!href?.startsWith('/') || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return;
  event.preventDefault();
  navigateTo(href);
}
