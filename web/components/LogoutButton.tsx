export function LogoutButton() {
  return (
    <form action="/logout" method="post">
      <button
        type="submit"
        className="w-full text-xs text-neutral-500 hover:text-neutral-900 py-1"
      >
        Logout
      </button>
    </form>
  );
}
