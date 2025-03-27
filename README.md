# ✨ Textractor ✨

<p align="center">
  <img src="./public/icon.jpg" alt="Textractor Logo" width="200"/>
  <!-- Add a real screenshot URL once you have one -->
  <br/>
  <i>Combine text files effortlessly. Drag, drop, reorder, and copy.</i>
</p>

<p align="center">
  <!-- Add relevant badges here -->
  <img src="https://img.shields.io/badge/Next.js-13%2B-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/React-18%2B-blue?logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5%2B-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind%20CSS-3%2B-blueviolet?logo=tailwindcss" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Framer%20Motion-10%2B-orange?logo=framer" alt="Framer Motion">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

**Textractor** is a sleek web application built with Next.js and modern web technologies that allows you to easily upload, reorder, and combine the content of multiple text-based files. The combined output is conveniently formatted using Markdown code blocks, including the filename and guessed language extension, ready to be copied and used anywhere – perfect for feeding context to LLMs, compiling code snippets, or preparing documentation.

## 🚀 Features

*   **📁 Multi-File Upload:** Drag & drop or click to upload multiple files at once.
*   **↕️ Drag & Drop Sorting:** Intuitively reorder uploaded files to control the output sequence.
*   **📝 Automatic Combination:** File contents are automatically read and combined into a single output.
*   **💻 Markdown Formatting:** Output is wrapped in Markdown code blocks (` ``` `) with filenames and language hints based on file extensions.
*   **📄 Text File Focus:** Option to toggle between combining *all* uploaded files or *only* recognized text files.
*   **✂️ One-Click Copy:** Easily copy the entire combined text output to your clipboard.
*   **🗑️ File Management:** Remove individual files or clear the entire list with a confirmation step.
*   **🎨 Modern UI:** Clean, responsive interface built with Tailwind CSS and enhanced with smooth animations using Framer Motion.
*   **⚙️ Extensive File Type Support:** Recognizes a wide variety of common text and code file extensions.

## 🛠️ Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/) (App Router)
*   **UI Library:** [React](https://reactjs.org/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Animations:** [Framer Motion](https://www.framer.com/motion/)
*   **File Uploads:** [React Dropzone](https://react-dropzone.js.org/)
*   **Drag & Drop:** [@dnd-kit](https://dndkit.com/)

## 🏁 Getting Started

Follow these steps to get Textractor running on your local machine.

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18.x or later recommended)
*   [npm](https://www.npmjs.com/), [yarn](https://yarnpkg.com/), or [pnpm](https://pnpm.io/)

### Installation & Running

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/textractor.git
    cd textractor
    ```
    *(Replace `your-username/textractor.git` with the actual repository URL)*

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```

4.  **Open your browser:**
    Navigate to `http://localhost:3000` (or the port specified in your console).

## 📚 Usage

1.  **Upload Files:** Drag and drop your text files onto the designated drop zone on the left, or click the drop zone to open your system's file selector.
2.  **Reorder Files:** Click and drag the file tiles in the list to change the order in which their content will appear in the final output.
3.  **Manage Files:**
    *   Click the trash icon (🗑️) on a file tile to remove it individually.
    *   Click the "Clear All" button to remove all uploaded files (a confirmation prompt will appear).
4.  **Configure Output:** Use the "Combine Text Files Only" toggle under Settings to control whether non-text files (like images or binaries, based on extension) are included in the output.
5.  **View & Copy Output:** The combined text automatically appears in the right panel, formatted with Markdown code blocks. Click the "Copy Text" button to copy it to your clipboard.

## 📄 Supported Text File Extensions

Textractor attempts to identify text files based on their extensions. The following extensions are currently recognized as text-based:


txt, md, js, jsx, ts, tsx, html, css, scss, sass, less, json, xml, yaml, yml,
py, java, c, cpp, cs, go, rs, php, rb, pl, sh, bat, h, swift, kt, sql,
config, ini, env, gitignore, htaccess, log, csv, tsv

Files with other extensions can still be uploaded, but their content might not be readable as text and they will be excluded from the output if "Combine Text Files Only" is enabled.

## 🤝 Contributing

Contributions are welcome! If you have suggestions for improvements or find a bug, please feel free to open an issue or submit a pull request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📜 License

Distributed under the MIT License. See `LICENSE` file for more information. (You should add a LICENSE file to your project).
