import { Redirect } from 'expo-router';

/** Legacy quick-create deep link → students list (create via modal). */
export default function CreateStudentRedirect() {
  return <Redirect href={'/students' as never} />;
}
