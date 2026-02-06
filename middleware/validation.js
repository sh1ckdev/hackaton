


export const validateCaseCreation = (req, res, next) => {
  const { title, description, requirements, difficulty, max_participants, opens_at } = req.body;


  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'Название кейса обязательно' });
  }

  if (title.length > 255) {
    return res.status(400).json({ error: 'Название кейса слишком длинное (максимум 255 символов)' });
  }

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return res.status(400).json({ error: 'Описание кейса обязательно' });
  }

  if (description.length > 10000) {
    return res.status(400).json({ error: 'Описание слишком длинное (максимум 10000 символов)' });
  }


  if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
    return res.status(400).json({ error: 'Некорректная сложность' });
  }


  if (max_participants !== undefined) {
    const maxParticipants = parseInt(max_participants);
    if (isNaN(maxParticipants) || maxParticipants < 0 || maxParticipants > 10000) {
      return res.status(400).json({ error: 'Некорректное количество участников' });
    }
  }


  if (opens_at) {
    const openDate = new Date(opens_at);
    if (isNaN(openDate.getTime())) {
      return res.status(400).json({ error: 'Некорректная дата открытия' });
    }

    if (openDate < new Date(Date.now() - 60000)) {
      return res.status(400).json({ error: 'Дата открытия не может быть в прошлом' });
    }
  }


  if (requirements && typeof requirements === 'string' && requirements.length > 5000) {
    return res.status(400).json({ error: 'Требования слишком длинные (максимум 5000 символов)' });
  }

  next();
};


export const validateSolutionCreation = (req, res, next) => {
  const { case_id, title, description, github_url, demo_url } = req.body;


  if (!case_id) {
    return res.status(400).json({ error: 'ID кейса обязателен' });
  }

  const caseId = parseInt(case_id);
  if (isNaN(caseId) || caseId <= 0) {
    return res.status(400).json({ error: 'Некорректный ID кейса' });
  }

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'Название решения обязательно' });
  }

  if (title.length > 255) {
    return res.status(400).json({ error: 'Название решения слишком длинное (максимум 255 символов)' });
  }


  if (!github_url || typeof github_url !== 'string') {
    return res.status(400).json({ error: 'Ссылка на GitHub репозиторий обязательна' });
  }


  try {
    const githubUrl = new URL(github_url);
    if (!githubUrl.hostname.includes('github.com')) {
      return res.status(400).json({ error: 'Укажите корректную ссылку на GitHub репозиторий' });
    }
    if (github_url.length > 2048) {
      return res.status(400).json({ error: 'URL слишком длинный' });
    }
  } catch {
    return res.status(400).json({ error: 'Некорректный формат URL GitHub' });
  }


  if (demo_url) {
    try {
      const demoUrl = new URL(demo_url);
      if (!['http:', 'https:'].includes(demoUrl.protocol)) {
        return res.status(400).json({ error: 'Некорректный протокол для demo URL' });
      }
      if (demo_url.length > 2048) {
        return res.status(400).json({ error: 'URL слишком длинный' });
      }
    } catch {
      return res.status(400).json({ error: 'Некорректный формат demo URL' });
    }
  }


  if (description && typeof description === 'string' && description.length > 5000) {
    return res.status(400).json({ error: 'Описание слишком длинное (максимум 5000 символов)' });
  }

  next();
};


export const validateTeamCreation = (req, res, next) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Название команды обязательно' });
  }

  if (name.trim().length < 2) {
    return res.status(400).json({ error: 'Название команды должно содержать минимум 2 символа' });
  }

  if (name.length > 255) {
    return res.status(400).json({ error: 'Название команды слишком длинное (максимум 255 символов)' });
  }


  if (name.trim().length === 0) {
    return res.status(400).json({ error: 'Название команды не может состоять только из пробелов' });
  }

  next();
};


export const validateTeamJoin = (req, res, next) => {
  const { team_code } = req.body;

  if (!team_code || typeof team_code !== 'string') {
    return res.status(400).json({ error: 'Код команды обязателен' });
  }

  if (team_code.trim().length !== 6) {
    return res.status(400).json({ error: 'Код команды должен содержать 6 символов' });
  }


  if (!/^[A-Z]{6}$/.test(team_code.toUpperCase())) {
    return res.status(400).json({ error: 'Код команды должен содержать только буквы' });
  }

  next();
};


export const validateIdParam = (req, res, next) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ error: 'ID обязателен' });
  }

  const numId = parseInt(id, 10);
  if (isNaN(numId) || numId <= 0 || numId > Number.MAX_SAFE_INTEGER) {
    return res.status(400).json({ error: 'Некорректный ID' });
  }

  req.params.id = numId;
  next();
};
