class RenderHelpers {

    static outputArray(lines, maxChars = 50) {
        let processedLines = [];
        lines.forEach((line) => {
            let output = "";
            if (line[0] !== undefined) {
                if (line.length === 1 && line[0] === "\\-") {
                    output += line[0];
                } else {
                    output += line.length === 1 ? "<strong>" + line[0] + "</strong>" : line[0];
                }
            }
            if (line[1] !== undefined) {
                output += " ".repeat(maxChars - line[0].length) + line[1];
            }
            if (line[2] !== undefined) {
                output += "\t " + line[2];
            }
            processedLines.push(output);
        });

        const longestLineLength = processedLines.reduce((maxLength, line) => Math.max(maxLength, line.length), 0);
        processedLines = processedLines.map((line) => {
            if (line === "\\-") {
                line = "-".repeat(longestLineLength);
            }
            return line;
        });

        return processedLines.join("\n");
    }

}
