import type { UserValidateEvent } from "@netlify/functions";
export default {
  userValidate(event: UserValidateEvent) {
    return event.deny();
  },
};
