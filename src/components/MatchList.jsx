const MatchList = ({ currentUser, matches = [], friendships = {}, onFriend }) => {
  const userFriends = friendships[currentUser] || [];

  if (!currentUser) {
    return (
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 text-slate-300">
        Register on the first tab to unlock matchmaking.
      </div>
    );
  }

  if (!matches.length) {
    return (
      <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-6 text-amber-100">
        Upload your schedule to see overlapping students saved in this browser.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map((match) => {
        const alreadyFriend = userFriends.includes(match.username);
        return (
          <article
            key={match.username}
            className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/40"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-wide text-slate-500">Shared study buddy</p>
                <h3 className="text-2xl font-semibold text-white">@{match.username}</h3>
                <p className="text-sm text-slate-400">
                  {match.sharedCourses.length} overlapping class{match.sharedCourses.length > 1 ? 'es' : ''} • score {match.score}%
                </p>
              </div>
              <button
                className={`inline-flex items-center justify-center rounded-2xl px-5 py-2 text-sm font-semibold transition ${
                  alreadyFriend
                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-400/90 text-emerald-950 hover:bg-emerald-300 hover:shadow-lg hover:shadow-emerald-500/40'
                }`}
                disabled={alreadyFriend}
                onClick={() => onFriend(match.username, match.sharedCourses)}
              >
                {alreadyFriend ? 'Friended' : 'Friend + fetch study spaces'}
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {match.sharedCourses.map((course) => (
                <div key={course.id} className="rounded-2xl border border-slate-800/70 bg-slate-950/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{course.time || 'TBD time'}</p>
                  <h4 className="text-lg font-semibold text-white">{course.courseName || 'Course'}</h4>
                  <p className="text-sm text-slate-400">{course.professor || 'Professor TBD'}</p>
                  <p className="mt-2 text-sm text-emerald-300">{course.location || 'On campus'}</p>
                </div>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default MatchList;
