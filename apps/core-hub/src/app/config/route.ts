const mainMenu = [
  {
    label: "Basic auth accounts",
    path: "/basic-auth-accounts"
  },
  {
    label: "Users",
    path: "/users"
  },
  {
    label: "Tasks",
    path: "/tasks"
  }
]

export const dynamic = 'force-dynamic'

export async function GET() {
  const SELF_ROOT = process.env.SELF_ROOT ?? 'http://localhost:3000'
  const AUTH_SVC = process.env.AUTH_SVC ?? 'http://0.0.0.0:8091/auth'
  const TASK_TRACKER_SVC = process.env.TASK_TRACKER_SVC ?? 'http://0.0.0.0:8092/task-tracker'

  return Response.json({
    err: null,
    globalConfig: {
      selfRoot: SELF_ROOT,
      serviceLookup: {
        auth: AUTH_SVC,
        taskTracker: TASK_TRACKER_SVC,
      },
      navigation: {
        mainMenu
      },
      auth: {
        allowUsernameRegistration: false,
      }
    },
  });
}
