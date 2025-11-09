export const seedUsers = [
  { username: 'amelia', password: 'Boiler#1' },
  { username: 'rahul', password: 'Boiler#2' },
  { username: 'linh', password: 'Boiler#3' }
];

export const seedCourses = {
  amelia: [
    {
      id: 'cs180-amelia',
      courseName: 'CS 18000 - Problem Solving and Object-Oriented Programming',
      professor: 'Prof. Li',
      location: 'Lawson 1142',
      time: 'MWF · 10:30a-11:20a'
    },
    {
      id: 'math261-amelia',
      courseName: 'MA 26100 - Multivariate Calculus',
      professor: 'Dr. Owens',
      location: 'WALC 1055',
      time: 'TR · 12:00p-1:15p'
    }
  ],
  rahul: [
    {
      id: 'cs180-rahul',
      courseName: 'CS 18000 - Problem Solving and Object-Oriented Programming',
      professor: 'Prof. Li',
      location: 'Lawson 1142',
      time: 'MWF · 10:30a-11:20a'
    },
    {
      id: 'stat350-rahul',
      courseName: 'STAT 35000 - Intro to Statistics',
      professor: 'Dr. Patel',
      location: 'REC 108',
      time: 'TR · 9:00a-10:15a'
    }
  ],
  linh: [
    {
      id: 'math261-linh',
      courseName: 'MA 26100 - Multivariate Calculus',
      professor: 'Dr. Owens',
      location: 'WALC 1055',
      time: 'TR · 12:00p-1:15p'
    },
    {
      id: 'eng106-linh',
      courseName: 'ENGL 10600 - First-Year Composition',
      professor: 'Prof. Alvarez',
      location: 'HEAV 220',
      time: 'MWF · 2:30p-3:20p'
    }
  ]
};

export const seedFriendships = {
  amelia: ['rahul'],
  rahul: ['amelia'],
  linh: []
};
