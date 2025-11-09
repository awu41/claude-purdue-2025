const GENAI_ENDPOINT = 'https://genai.rcac.purdue.edu/api/chat/completions';
const MAPS_ENDPOINT = 'https://maps.googleapis.com/maps/api/distancematrix/json';

const sanitize = (value) => (value || '').trim();

const mockCatalog = [
  {
    name: 'Hicks Undergraduate Library',
    pros: ['24/7 access', 'Group study rooms', 'Whiteboard walls'],
    anchor: 'Hicks Undergraduate Library, West Lafayette, IN'
  },
  {
    name: 'Wilmeth Active Learning Center (WALC)',
    pros: ['Reservable huddle rooms', 'Built-in power at every seat', 'Cafe on level 1'],
    anchor: 'Wilmeth Active Learning Center, West Lafayette, IN'
  },
  {
    name: 'Krach Leadership Center',
    pros: ['Large tables for teams', 'Late hours', 'Nearby dining options'],
    anchor: 'Krach Leadership Center, West Lafayette, IN'
  },
  {
    name: 'Honors College & Residences Study Lounges',
    pros: ['Natural lighting', 'Quiet zones and collaboration pods'],
    anchor: '1101 3rd Street, West Lafayette, IN'
  }
];

const randomSubset = (list, size = 2) => {
  const copy = [...list];
  copy.sort(() => 0.5 - Math.random());
  return copy.slice(0, size);
};

const mockStudySpaces = (course) => {
  const base = randomSubset(mockCatalog, 3);
  return base.map((spot, idx) => ({
    locationName: `${spot.name}`,
    pros: spot.pros,
    context: `Nearby ${course.location || 'campus'} • suggestion #${idx + 1}`,
    anchor: spot.anchor
  }));
};

const parseAiResponse = (text = '') => {
  if (!text.trim()) return [];
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks
    .map((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
      if (!lines.length) return null;
      const locationName = lines[0].replace(/^\d+\.?\s*/, '');
      const pros = lines
        .slice(1)
        .map((line) => line.replace(/^[-•]\s*/, '').trim())
        .filter(Boolean);
      if (!locationName) return null;
      return { locationName, pros: pros.length ? pros : ['Quiet tables', 'Close to class'] };
    })
    .filter(Boolean);
};

const fetchAiSuggestions = async (course) => {
  const apiKey = import.meta.env?.VITE_GENAI_API_KEY;
  const prompt = `I have a class at ${course.location || 'Purdue campus'}, find me study spaces within a 0.25 mile radius and list pros of each location`;

  if (!apiKey) {
    return mockStudySpaces(course);
  }

  try {
    const response = await fetch(GENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3.1:latest',
        messages: [{ role: 'user', content: prompt }],
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`GENAI error ${response.status}`);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content || '';
    const parsed = parseAiResponse(content);
    return parsed.length ? parsed : mockStudySpaces(course);
  } catch (error) {
    console.warn('GENAI request failed, falling back to mock data', error);
    return mockStudySpaces(course);
  }
};

const fetchDistance = async (origin, destination) => {
  const defaultUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
  const apiKey = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return {
      text: '≈5 min walk (mocked)',
      url: defaultUrl,
      source: 'local-mock'
    };
  }

  try {
    const url = `${MAPS_ENDPOINT}?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&mode=walking&units=imperial&key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Maps API error ${response.status}`);
    }
    const data = await response.json();
    const element = data?.rows?.[0]?.elements?.[0];
    if (element?.status === 'OK') {
      return {
        text: element?.distance?.text || element?.duration?.text || 'distance unavailable',
        url: defaultUrl,
        source: 'google-maps'
      };
    }
    throw new Error('No distance data returned');
  } catch (error) {
    console.warn('Google Maps request failed, using mock distance', error);
    return {
      text: 'distance unavailable (mocked)',
      url: defaultUrl,
      source: 'maps-mock'
    };
  }
};

export const getStudySuggestions = async ({ courses, origin }) => {
  if (!courses?.length) return [];

  const suggestions = [];
  for (const course of courses) {
    const normalized = {
      ...course,
      courseName: sanitize(course.courseName) || 'Shared course',
      location: sanitize(course.location) || 'Purdue campus'
    };

    const aiSuggestions = await fetchAiSuggestions(normalized);
    for (const spot of aiSuggestions) {
      const distance = await fetchDistance(origin, spot.anchor || spot.locationName);
      suggestions.push({
        id: `${normalized.id || normalized.courseName}-${spot.locationName}`,
        courseName: normalized.courseName,
        classLocation: normalized.location,
        locationName: spot.locationName,
        pros: spot.pros || ['Open seating', 'Power outlets nearby'],
        distanceText: distance.text,
        mapsUrl: distance.url,
        distanceSource: distance.source,
        courseContext: spot.context || `Suggested for ${normalized.courseName}`
      });
    }
  }

  return suggestions;
};
