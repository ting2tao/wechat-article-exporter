export default defineNuxtRouteMiddleware(async to => {
  const { authState, refreshSession } = useAppAuth();

  if (!authState.value.checked) {
    await refreshSession();
  }

  if (to.path === '/login') {
    if (authState.value.authenticated) {
      const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : '/dashboard/account';
      return navigateTo(redirect);
    }

    return;
  }

  if (!authState.value.authenticated) {
    return navigateTo({
      path: '/login',
      query: {
        redirect: to.fullPath,
      },
    });
  }
});
