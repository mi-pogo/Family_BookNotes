import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const db = new pg.Client({user: "MyUser", host: "192.168.1.220", database: "book_db", password: "MyPass", port: 5432});
db.connect();


let myUsers = [];
let myUserBooks = [];
// { id: 4, firstName: "John", lastName: "Wick" }

async function getUsers() {
    try{
      const result = await db.query("SELECT * FROM users");
      let myItems = [];
      if(result.rows.length > 0){
        result.rows.forEach((item) => {
          myItems.push( { id: item.id, firstName: item.first_name, lastName: item.last_name, picId: item.pic_id });
        });
      }
      return myItems;
    }
    catch(error){
      console.error("Error in querry exec !", error.message);
      return -1;
    }
}

async function getUserBooks(usr_id) {
  try{
    const result = await db.query("SELECT title, author, usr_note, usr_rating, usr_read_date, cover_id, read_books.id FROM read_books JOIN users ON users.id = usr_id  WHERE users.id = $1",[usr_id]);

    let myItems = [];
    if(result.rows.length > 0){
      result.rows.forEach((item) => {
        let read_date_formatted = item.usr_read_date.toISOString().split('T')[0]; // "YYYY-MM-DD"
        myItems.push( { title: item.title, author: item.author, note: item.usr_note, rating: item.usr_rating, read_date: read_date_formatted, cover_id: item.cover_id, book_id: item.id });
      });
    }
    return myItems;
  }
  catch(error){
    console.error("Error in querry exec !", error.message);
    return -1;
  }
}

async function insertUser(myFirstName, myLastName, myAvatarId) {
  try{
    const result = await db.query("INSERT INTO users (first_name, last_name, pic_id) VALUES ($1, $2, $3)", [myFirstName, myLastName, myAvatarId]);
    return result;
  }
  catch(error){
    console.error("Error in querry exec !", error.message);
    return -1;
  }  
}

async function deleteUser(userId) {
  try{
    let result = await db.query("DELETE FROM read_books WHERE usr_id=$1", [userId]);
    result = await db.query("DELETE FROM users WHERE id=$1", [userId]);
    return result;
  }
  catch(error){
    console.error("Error in querry exec !", error.message);
    return -1;
  }  
}

async function getSortedBooks(usr_id, sort_by) {
  try{
    const result = await db.query(`SELECT title, author, usr_note, usr_rating, usr_read_date, cover_id, read_books.id FROM read_books JOIN users ON users.id = usr_id  WHERE users.id = $1 ORDER BY ${sort_by} ASC`,[usr_id]);

    let myItems = [];
    if(result.rows.length > 0){
      result.rows.forEach((item) => {
        let read_date_formatted = item.usr_read_date.toISOString().split('T')[0]; // "YYYY-MM-DD"
        myItems.push( { title: item.title, author: item.author, note: item.usr_note, rating: item.usr_rating, read_date: read_date_formatted, cover_id: item.cover_id, book_id: item.id });
      });
    }
    return myItems;
  }
  catch(error){
    console.error("Error in querry exec !", error.message);
    return -1;
  }
}

async function insertReadBooks(myReadBooks) {
  const year = myReadBooks.yearRead;
  const month = myReadBooks.monthRead;
  const day = myReadBooks.dayRead;
  const myCoverId = parseInt(myReadBooks.coverId, 10) || 0;

  const readDate = `${year}/${month}/${day}`;

  try{
    const result = await db.query("INSERT INTO read_books (title, author, usr_note, usr_rating, usr_read_date, usr_id, cover_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                                   [myReadBooks.bookTitle, myReadBooks.bookAuthor, myReadBooks.myNotes, myReadBooks.myRating, readDate, myReadBooks.userId, myCoverId]);
    return result;
  }
  catch(error){
    console.error("Error in querry exec !", error.message);
    return -1;
  }  
}

async function updateBook(myBookId, myRating, myNote) {
  myBookId = parseInt(myBookId, 10) || 0;
  myRating = parseInt(myRating, 10) || 0;
  
  try{
    const result = await db.query("UPDATE read_books SET usr_rating=$1, usr_note=$2 WHERE id=$3", [myRating, myNote, myBookId]);
    return result;
  }  
  catch(error){
    console.error("Error in querry exec !", error.message);
    return -1;
  }    
}

async function deleteBook(myBookId) {
  try{
    const result = await db.query("DELETE FROM read_books WHERE id=$1", [myBookId]);
    return result;
  }  
  catch(error){
    console.error("Error in querry exec !", error.message);
    return -1;
  }
}


app.get("/", async (req, res) => {
    let response = await getUsers();
    console.log("Get Response: ", response);
     
    if (response !== -1){
      myUsers = response;
      res.render("index.ejs", { usersList: myUsers });
    }
    else{
        res.render("index.ejs", {users_error: "No users to display"});
    }
});

app.post("/adduser", async (req, res) => {
  const myFirstName = req.body.firstNameBox;
  const myLastName = req.body.lastNameBox;
  const myAvatar = req.body.selectedAvatar;

  if (!myFirstName || myFirstName.trim() === '' || !myLastName || myLastName.trim() === '' || !myAvatar || myAvatar.trim() === '') {
    res.render("userbooks.ejs", {userbooks_error: "User name or avatar cannot be empty !"});
  }
  else{
    let myAvatarId = parseInt(myAvatar.slice(6), 10);
    let response = await insertUser(myFirstName, myLastName, myAvatarId);
    if (response !== -1){
      res.redirect("/");
    }
    else{
        res.render("userbooks.ejs", {userbooks_error: "Could not add user !"});
    }    
  }
});

app.post("/deleteuser", async (req, res) => {
  let userId = req.body.userId;

  let response = await deleteUser(userId);
  if (response !== -1){
    res.redirect("/");
  }
  else{
      res.render("userbooks.ejs", {userbooks_error: "Could not delete user !"});
  }
});


async function viewUserBooks(res, userId) {

  let response = await getUserBooks(userId);
  console.log("View Response: ", response);

  const userData = myUsers.find(user => user.id === Number(userId));

  if (response !== -1){
    myUserBooks = response;
    res.render("userbooks.ejs", { userBooks: myUserBooks, user: userData });
  }
  else{
      res.render("userbooks.ejs", { user: userData, userbooks_error: "No books to display"});
  }

  return 0;

}


app.post("/view", async (req, res) => {
  
  await viewUserBooks(res, req.body.userId);

});

app.post("/addbook", async (req, res) => {
  let newBook = { userId: req.body.userId, firstName: req.body.firstName, lastName: req.body.lastName, bookTitle: req.body.bookTitle, bookAuthor: req.body.bookAuthor, coverId: req.body.coverId, picId: req.body.picId }
  res.render("useraddbook.ejs", { newBook: newBook });
});

app.post("/insertbook", async (req, res) => {
  const readBooks = req.body;

  console.log ("ReadBooks: ", readBooks);

  let response = await insertReadBooks(readBooks);

  if (response !== -1){
    await viewUserBooks(res, req.body.userId);
  }
  else{
      res.render("userbooks.ejs", {userbooks_error: "Could not insert book !"});
  }
});

app.post("/editbook", async (req, res) => {
  const bookId = req.body.book_id;
  const bookNote = req.body.book_note;
  const bookRating = req.body.book_rating;
  const bookCoverId = req.body.cover_id;
  const bookTitle = req.body.book_title;
  const bookAuthor = req.body.book_author;
  const userId = req.body.userId;

  if (req.body.action === "edit"){
    const userData = myUsers.find(user => user.id === Number(userId));
    res.render("usereditbook.ejs", { bookId: bookId, bookNote: bookNote, bookRating:bookRating, bookCoverId:bookCoverId, bookTitle:bookTitle, bookAuthor:bookAuthor, user: userData });
  }

  if (req.body.action === "delete"){
    let response = await deleteBook(bookId);

    if (response !== -1){
      await viewUserBooks(res, userId);
    }
    else{
        res.render("userbooks.ejs", {userbooks_error: "Could not delete book !"});
    }    
  }
});

app.post("/updatebook", async (req, res) => {
  const userId = req.body.userId;
  const bookId = req.body.bookId;
  const bookNote = req.body.myNotes;
  const bookRating = req.body.myRating;

  console.log("bookId bookNote bookRating: ", bookId, bookNote, bookRating);

  let response = await updateBook(bookId, bookRating, bookNote);

  if (response !== -1){
    await viewUserBooks(res, userId);
  }
  else{
      res.render("userbooks.ejs", {userbooks_error: "Could not update book !"});
  }  
});


app.post("/sortbooks", async (req, res) => {
  let response = await getSortedBooks(req.body.userId, req.body.sortBy);
  console.log("Select: ", req.body.sortBy);
  console.log("View Response: ", response);

  const userData = myUsers.find(user => user.id === Number(req.body.userId));
  if (response !== -1){
    myUserBooks = response;
    res.render("userbooks.ejs", { userBooks: myUserBooks, user: userData, sortBy: req.body.sortBy });
  }
  else{
      res.render("userbooks.ejs", {userbooks_error: "No books to display", user: userData});
  }
});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
