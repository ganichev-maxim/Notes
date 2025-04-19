const PREFIX = "/notes";

const req = (url, options = {}) => {
  const { body, method } = options;

  const isGetWithContent = method === "GET" && !!body;
  if (isGetWithContent) {
    url += '?' + (new URLSearchParams(body)).toString();
  }

  return fetch((PREFIX + url).replace(/\/\/$/, ""), {
    ...options,
    body: body && !isGetWithContent ? JSON.stringify(body) : null,
    headers: {
      ...options.headers,
      ...(body && !isGetWithContent
        ? {
            "Content-Type": "application/json",
          }
        : null),
    },
  }).then((res) =>
    res.ok
      ? res.json()
      : res.text().then((message) => {
          throw new Error(message);
        })
  );
};

export const getNotes = ({ age, search, page } = {}) => {
  return req("", {
    method: "GET",
    body: { age, search, page }
  });
};

export const createNote = (title, text) => {
  return req("", {
    method: "POST",
    body: { title, text }
  });
};

export const getNote = (id) => {
  return req(`/${id}`, {
    method: "GET"
  });
};

export const archiveNote = (id) => {
  return req(`/${id}/archive`, {
    method: "POST"
  });
};

export const unarchiveNote = (id) => {
  return req(`/${id}/unarchive`, {
    method: "POST"
  });
};

export const editNote = (id, title, text) => {
  return req(`/${id}`, {
    method: "PATCH",
    body: {
      title,
      text
    }
  });
};

export const deleteNote = (id) => {
  return req(`/${id}`, {
    method: "DELETE"
  });
};

export const deleteAllArchived = () => {
  return req(`/archive`, {
    method: "DELETE"
  });
};

export const notePdfUrl = (id) => {
  return `${PREFIX}/${id}/pdf`;
};
