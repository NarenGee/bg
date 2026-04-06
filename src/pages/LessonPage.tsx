import { useParams } from 'react-router-dom';
export default function LessonPage() {
  const { id } = useParams();
  return <div className="p-8 font-serif text-wood-dark">Lesson {id} — coming soon</div>;
}
