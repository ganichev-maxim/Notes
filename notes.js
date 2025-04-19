const express = require('express');
const { getNotes, addNote, getNote, editNote, archiveNote, deleteNote, deleteArchive } = require("./db");
const notesRouter = express.Router();
const sanitizeHtml = require('sanitize-html');
const markdownIt = require('markdown-it')({
  linkify: true,
  typographer: true,
  image: true
});
const PuppeteerHTMLPDF = require("puppeteer-html-pdf");

notesRouter.get("/", async (req, res) => {
  const notes = await getNotes(req.user._id, req.query.age, req.query.search, req.query.page);
  notes.data.forEach(note => note.created = convertToDate(note.created))
  res.json({
    hasMore: notes.hasMore,
    data: notes.data.map(note => noteToView(note))
  });
});

notesRouter.post("/", async (req, res) => {
  const _id = await addNote(req.user._id, req.body.title, req.body.text)
  res.json({_id});
});

notesRouter.get("/:id", async (req, res) => {
  const note = await getNote(req.user._id, req.params.id)
  res.json(noteToView(note));
});

notesRouter.patch("/:id", async (req, res) => {
  await editNote(req.user._id, req.params.id, req.body.title, req.body.text)
  res.status(200).json({message: "OK"});
});

notesRouter.post("/:id/archive", async (req, res) => {
  await archiveNote(req.user._id, req.params.id, true)
  res.status(200).json({message: "OK"});
});

notesRouter.post("/:id/unarchive", async (req, res) => {
  await archiveNote(req.user._id, req.params.id, false)
  res.status(200).json({message: "OK"});
});

notesRouter.delete("/archive", async (req, res) => {
  await deleteArchive(req.user._id)
  res.status(200).json({message: "OK"});
});

notesRouter.delete("/:id", async (req, res) => {
  await deleteNote(req.user._id, req.params.id)
  res.status(200).json({message: "OK"});
});

notesRouter.get("/:id/pdf", async (req, res) => {
  const note = await getNote(req.user._id, req.params.id)
  if (note) {
    const htmlPDF = new PuppeteerHTMLPDF();
    htmlPDF.setOptions({ format: "A4" });
    const pdfBuffer = await htmlPDF.create(noteToView(note).html);
    res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=note_${req.params.id}.pdf`,
        'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);
  } else {
    res.status(404).send('Note not found');
  }
});

function convertToDate(ms) {
  return new Date(ms);
}

function noteToView(note) {
  if (note) {
    return {
      _id: note._id,
      title: note.title,
      text: note.text,
      html: convertToHtml(note.text),
      isArchived: note.isArchived,
      created: convertToDate(note.created),
      highlights: note.highlights
    }
  }
  return null;
}

function convertToHtml(markdownText) {
  if (markdownText) {
    return sanitizeHtml(markdownIt.render(markdownText));
  }
  return "";
}

module.exports = notesRouter;
