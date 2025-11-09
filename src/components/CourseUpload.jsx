import { useMemo, useState } from 'react';
import Papa from 'papaparse';

const friendlyFields = ['Course Name / Name', 'Professor / Instructor', 'Location', 'Time or Day + Start/End'];

const coerceValue = (row, keyOptions, fallback = '') => {
  for (const key of keyOptions) {
    if (row[key] && String(row[key]).trim()) {
      return String(row[key]).trim();
    }
  }
  return fallback;
};

const buildTimeSlot = (row) => {
  const day = coerceValue(row, ['Day Of Week', 'Day', 'Days']);
  const start = coerceValue(row, ['Published Start', 'Start', 'Start Time']);
  const end = coerceValue(row, ['Published End', 'End', 'End Time']);
  if (!day && !start && !end) return '';
  if (day && start && end) return `${day} · ${start}-${end}`;
  if (day && (start || end)) return `${day} · ${start || end}`;
  if (start || end) return `${start || ''}-${end || ''}`.replace(/^-|-$|--/g, '').trim();
  return day;
};

const normalizeRow = (row = {}, idx) => {
  const courseName = coerceValue(row, ['Course Name', 'course_name', 'Course', 'Name', 'Title']);
  const professor = coerceValue(row, ['Professor', 'professor', 'Instructor', 'Instructor / Organization']);
  const location = coerceValue(row, ['Location', 'location', 'Room']);
  const time = coerceValue(row, ['Time', 'time', 'Schedule']) || buildTimeSlot(row);

  const metadata = coerceValue(row, ['Section', 'Type']);

  const issues = [];
  if (!courseName) issues.push('Missing course name');
  if (!location) issues.push('Missing location');
  if (!time) issues.push('Missing time slot');

  return {
    course: {
      id: row.id || `${Date.now()}-${idx}`,
      courseName,
      professor: metadata ? `${professor}${professor ? ' • ' : ''}${metadata}` : professor,
      location,
      time
    },
    status: {
      row: idx + 1,
      ok: issues.length === 0,
      issues: issues.length ? issues : ['Parsed successfully']
    }
  };
};

const CourseUpload = ({ currentUser, courses = [], onCoursesParsed }) => {
  const [isParsing, setIsParsing] = useState(false);
  const [statusRows, setStatusRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  const emptyState = !currentUser;

  const courseCountLabel = useMemo(() => {
    if (!courses.length) return 'No courses stored yet';
    return `${courses.length} course${courses.length > 1 ? 's' : ''} stored for ${currentUser}`;
  }, [courses.length, currentUser]);

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError('');
    setStatusRows([]);

    if (emptyState) {
      setError('Please register or sign in before uploading a schedule.');
      return;
    }

    setIsParsing(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mapped = results.data.map((row, idx) => normalizeRow(row, idx));
        const successfulCourses = mapped.filter((item) => item.status.ok).map((item) => item.course);
        const statuses = mapped.map((item) => item.status);

        setStatusRows(statuses);
        setIsParsing(false);

        if (!successfulCourses.length) {
          setError('No valid course rows detected. Check column names or data quality.');
          return;
        }

        onCoursesParsed(successfulCourses, statuses);
      },
      error: (parseError) => {
        console.error(parseError);
        setIsParsing(false);
        setError('Parsing failed. Confirm the CSV columns use headers like "Course Name" and "Location".');
      }
    });
  };

  return (
    <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 shadow-xl shadow-slate-900/40">
      <div className="mb-6 space-y-2">
        <p className="text-sm uppercase tracking-wide text-slate-500">Step 2</p>
        <h2 className="text-2xl font-semibold text-white">Upload your MyPurdue schedule</h2>
        <p className="text-sm text-slate-400">
          Accepts CSV exports. Expected columns: {friendlyFields.join(', ')}. Rows persist to <code className="text-amber-300">localStorage</code>.
        </p>
      </div>

      <label className="flex w-full flex-col gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-slate-300">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileUpload}
          className="hidden"
          disabled={emptyState}
        />
        <span className="text-lg font-medium text-white">{emptyState ? 'Sign in to enable uploads' : 'Drop a CSV or click to browse'}</span>
        <span className="text-sm text-slate-400">{fileName || 'Max 2MB • parsed fully in-browser via PapaParse'}</span>
        <div className="mx-auto mt-2 flex gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-300">{courseCountLabel}</span>
        </div>
      </label>

      {isParsing && (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Parsing CSV…
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {statusRows.length > 0 && (
        <div className="mt-6 space-y-2">
          <p className="text-sm font-medium text-slate-200">Parsing status</p>
          <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-800/80 bg-slate-950/40">
            {statusRows.map((row) => (
              <div
                key={`row-${row.row}`}
                className="flex items-start justify-between border-b border-slate-800/40 px-4 py-3 last:border-none"
              >
                <p className="text-sm text-slate-300">
                  Row {row.row}: {row.issues[0]}
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    row.ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-200'
                  }`}
                >
                  {row.ok ? 'Ready' : 'Fix row'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {courses.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Stored schedule</h3>
            <p className="text-xs text-slate-500">Auto-saved for {currentUser}</p>
          </div>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {courses.map((course) => (
              <article
                key={course.id}
                className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4"
              >
                <p className="text-sm uppercase tracking-wide text-slate-500">{course.time || 'TBD time'}</p>
                <h4 className="text-xl font-semibold text-white">{course.courseName || 'Course'}</h4>
                <p className="text-sm text-slate-400">{course.professor || 'Professor TBD'}</p>
                <p className="mt-2 text-sm text-emerald-300">{course.location || 'On campus'}</p>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseUpload;
