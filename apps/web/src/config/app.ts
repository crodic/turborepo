export default {
  name: 'vite-admin',
  description: 'Vite Admin',
  isSupperAdmin: (permissions: string[]) =>
    permissions
      .map((perm) => ({
        action: perm.split(':')[0],
        subject: perm.split(':')[1],
      }))
      .some((claim) => claim.subject === 'all' && claim.action === 'manage'),
}
