import { useParams } from 'react-router-dom';
export default function QuizPage() {
  const { id } = useParams();
  return <div className="p-8 font-serif text-wood-dark">Quiz {id} — coming soon</div>;
}
