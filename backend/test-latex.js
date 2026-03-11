const { fillTemplate } = require('./utils/latexTemplates');
const fs = require('fs');

async function run() {
    const mockData = {
        personalInfo: {
            fullName: "Rion tuscano",
            title: "software dev",
            email: "crce.10464.cea@gmail.com",
            phone: "99999999",
            location: "mumbai",
            github: "x",
            linkedin: "y",
            website: "google.com",
            summary: "Hello im rion. tuscano"
        },
        experience: [{
            company: "google",
            position: "sw",
            startDate: "jan 2002",
            endDate: "Present",
            current: true,
            description: "i build github"
        }],
        skills: [{ name: "react" }, { name: "aws" }, { name: "talking" }],
        achievements: [{ title: "nafajfaf" }],
        education: [{
            institution: "fr conco",
            degree: "be",
            startDate: "12/09/2004",
            endDate: "12/10/2009",
            description: "8.75"
        }],
        projects: [{
            name: "truelense",
            technologies: "react,",
            startDate: "",
            endDate: "-"
        }]
    };

    const latexSource = fillTemplate('modern', mockData);
    console.log('--- GENERATED LATEX ---\n', latexSource);

    const apiPayload = {
        compiler: 'pdflatex',
        resources: [
            {
                main: true,
                content: latexSource
            }
        ]
    };

    try {
        console.log('Sending to latex.ytotech.com...');
        const response = await fetch(
            'https://latex.ytotech.com/builds/sync',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(apiPayload)
            }
        );
        
        if (!response.ok) {
            const errText = await response.text();
            console.error('API Error:', response.status, errText);
            return;
        }
        
        const buf = await response.arrayBuffer();
        console.log('Success!', Buffer.from(buf).length, 'bytes');
    } catch (e) {
        console.error('Fetch Error:', e.message);
    }
}

run();
